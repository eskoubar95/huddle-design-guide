'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useApiRequest } from '@/lib/api/client';

interface ShippingLabelGeneratorProps {
  transactionId: string;
  orderCode?: string;
  existingLabelUrl?: string;
  trackingNumber?: string;
  onLabelGenerated?: (labelUrl: string, trackingNumber?: string) => void;
}

export function ShippingLabelGenerator({
  transactionId,
  orderCode,
  existingLabelUrl,
  trackingNumber,
  onLabelGenerated,
}: ShippingLabelGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | undefined>(existingLabelUrl);
  const [tracking, setTracking] = useState<string | undefined>(trackingNumber);
  const { toast } = useToast();
  const apiRequest = useApiRequest();

  const handleGenerateLabel = async () => {
    setIsGenerating(true);
    setError(null);

    // Validate transactionId is a valid UUID format (PostgreSQL compatible)
    // Note: PostgreSQL UUID type is more lenient than strict UUID spec
    if (!transactionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
      setError('Invalid transaction ID format. Please provide a valid UUID.');
      setIsGenerating(false);
      return;
    }

    try {
      // Fetch transaction details to get order information
      let transaction: {
        amount?: number;
        buyer_id?: string;
        seller_id?: string;
        status?: string;
      };
      
      try {
        transaction = await apiRequest<{
          amount?: number;
          buyer_id?: string;
          seller_id?: string;
          status?: string;
        }>(`/transactions/${transactionId}`);
      } catch (err: unknown) {
        if (err instanceof Error) {
          // Check if it's a 403 Forbidden error
          if (err.message.includes('403') || err.message.includes('FORBIDDEN') || err.message.includes('Access denied')) {
            throw new Error('Access denied: You must be the seller or buyer of this transaction to generate shipping labels.');
          }
          if (err.message.includes('404') || err.message.includes('NOT_FOUND')) {
            throw new Error(`Transaction not found. Please verify the transaction ID: ${transactionId}`);
          }
        }
        throw err;
      }

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Fetch buyer's default shipping address
      // Use buyer_id from transaction, or fallback to current user if not available
      const buyerId = transaction.buyer_id;
      if (!buyerId) {
        throw new Error('Transaction does not have a buyer ID');
      }

      interface ShippingAddress {
        id: string;
        full_name: string;
        street: string;
        city: string;
        postal_code: string;
        country: string;
        phone?: string;
        state?: string;
        is_default: boolean;
      }

      const { addresses } = await apiRequest<{ addresses: ShippingAddress[] }>(
        `/shipping/addresses?userId=${buyerId}`
      );
      const defaultAddress = addresses?.find((addr) => addr.is_default) || addresses?.[0];

      if (!defaultAddress) {
        throw new Error('No shipping address found. Please ensure buyer has a default shipping address set.');
      }

      // Get seller address (from profile or default)
      // For now, use default seller address (future: get from seller profile)
      const sellerAddress = {
        country: 'DK', // Default - should come from seller profile
        zip: '1130',
        city: 'Copenhagen',
        street: 'Rosenborggade 1',
      };

      // Default parcel dimensions (jersey)
      const parcels = {
        packages: [{
          parcelId: 'A00001',
          quantity: 1,
          width: 30, // cm
          height: 5, // cm
          length: 20, // cm
          weight: 0.5, // kg
          content: 'jersey',
          value: transaction.amount ? transaction.amount / 100 : 100, // Convert from minor units to EUR, fallback to 100
        }],
      };

      // Step 1: Get quotes first to find available service types
      // This ensures we use a service type that's actually available for this route
      const pickupAddress = {
        ...sellerAddress,
        country: sellerAddress.country.toUpperCase(), // Eurosender API requires uppercase ISO-2 codes
      };
      
      const deliveryAddress = {
        country: defaultAddress.country.toUpperCase(), // Eurosender API requires uppercase ISO-2 codes
        zip: defaultAddress.postal_code,
        city: defaultAddress.city,
        street: defaultAddress.street,
        region: defaultAddress.state || undefined,
      };

      const quotesResponse = await apiRequest<{
        options: {
          serviceTypes: Array<{
            id: string; // Quote ID
            serviceType: string; // e.g., "flexi", "regular_plus", "express"
            price: {
              original: {
                gross: number;
                net: number;
                vat: number;
              };
            };
            edt?: string; // Estimated delivery time
          }>;
        };
      }>('/shipping/quotes', {
        method: 'POST',
        body: JSON.stringify({
          shipment: {
            pickupAddress,
            deliveryAddress,
          },
          parcels,
          paymentMethod: 'credit',
          currencyCode: 'EUR',
        }),
      });

      // Step 2: Select first available service type
      console.log('[SHIPPING_LABEL] Quote response received:', {
        hasOptions: !!quotesResponse.options,
        hasServiceTypes: !!quotesResponse.options?.serviceTypes,
        serviceTypesCount: quotesResponse.options?.serviceTypes?.length || 0,
        firstServiceType: quotesResponse.options?.serviceTypes?.[0] ? JSON.stringify(quotesResponse.options.serviceTypes[0]) : 'undefined',
      });

      if (!quotesResponse.options?.serviceTypes || quotesResponse.options.serviceTypes.length === 0) {
        throw new Error('No shipping options available for this route. Please check the addresses and try again.');
      }

      // Filter out any undefined/null service types and validate
      const validServiceTypes = quotesResponse.options.serviceTypes.filter(
        (st) => st && st.serviceType && st.id
      );

      if (validServiceTypes.length === 0) {
        console.error('[SHIPPING_LABEL] Invalid quote response structure:', {
          rawResponse: quotesResponse,
          serviceTypes: quotesResponse.options.serviceTypes,
        });
        throw new Error('Invalid shipping quote response. Please try again or contact support.');
      }

      const selectedQuote = validServiceTypes[0];
      
      // Validate required fields
      if (!selectedQuote.serviceType || !selectedQuote.id) {
        console.error('[SHIPPING_LABEL] Selected quote missing required fields:', selectedQuote);
        throw new Error('Invalid shipping quote. Please try again.');
      }

      console.log('[SHIPPING_LABEL] Selected service type:', {
        serviceType: selectedQuote.serviceType,
        quoteId: selectedQuote.id,
        price: selectedQuote.price?.original?.gross,
      });

      // Step 3: Generate label with selected service type and quote ID
      // Ensure transactionId is valid UUID before sending
      if (!transactionId || typeof transactionId !== 'string') {
        throw new Error('Transaction ID is required and must be a valid UUID');
      }

      const requestBody = {
          transactionId: transactionId.trim(), // Ensure no whitespace
          serviceType: selectedQuote.serviceType, // Use service type from quote
          quoteId: selectedQuote.id, // Include quote ID for reference
          pickupAddress,
          deliveryAddress,
          parcels,
          pickupContact: {
            name: 'Seller', // Should come from seller profile
            phone: '+4512345678', // Should come from seller profile
            email: 'seller@example.com', // Should come from seller profile
          },
          deliveryContact: {
            name: defaultAddress.full_name || 'Buyer', // Should come from buyer profile
            phone: defaultAddress.phone || '+4512345678', // Should come from buyer profile
            email: 'buyer@example.com', // Should come from buyer profile
          },
          paymentMethod: 'credit', // Uses Huddle's prepaid credit on Eurosender account
          labelFormat: 'pdf',
          shippingMethodType: 'home_delivery',
        };

      const labelData = await apiRequest<{
        orderCode: string;
        status: string;
        labelUrl: string;
        trackingNumber?: string;
        alreadyExisted: boolean;
      }>('/shipping/labels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      setLabelUrl(labelData.labelUrl);
      setTracking(labelData.trackingNumber);

      if (labelData.alreadyExisted) {
        toast({
          title: 'Label Retrieved',
          description: 'Existing shipping label retrieved successfully.',
        });
      } else {
        toast({
          title: 'Label Generated',
          description: 'Shipping label generated successfully.',
        });
      }

      onLabelGenerated?.(labelData.labelUrl, labelData.trackingNumber);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadLabel = () => {
    if (labelUrl) {
      window.open(labelUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Shipping Label
        </CardTitle>
        <CardDescription>
          Generate and download shipping label for this order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {labelUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Label Ready</p>
                {tracking && (
                  <p className="text-sm text-muted-foreground">
                    Tracking: {tracking}
                  </p>
                )}
              </div>
              <Button onClick={handleDownloadLabel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Label
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Print this label and attach it to your package before shipping.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleGenerateLabel}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Label...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Generate Shipping Label
              </>
            )}
          </Button>
        )}

        {orderCode && !labelUrl && (
          <Button
            onClick={async () => {
              // Retrieve existing label
              try {
                const data = await apiRequest<{
                  labelUrl: string;
                  trackingNumber?: string;
                }>(`/shipping/labels/${orderCode}`);
                setLabelUrl(data.labelUrl);
                setTracking(data.trackingNumber);
                toast({
                  title: 'Label Retrieved',
                  description: 'Existing shipping label retrieved successfully.',
                });
                onLabelGenerated?.(data.labelUrl, data.trackingNumber);
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve label';
                toast({
                  title: 'Error',
                  description: errorMessage,
                  variant: 'destructive',
                });
              }
            }}
            variant="outline"
            className="w-full"
          >
            Retrieve Existing Label
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

