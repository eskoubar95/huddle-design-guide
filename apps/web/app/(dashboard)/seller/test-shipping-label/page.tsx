"use client";

import { ShippingLabelGenerator } from "@/components/seller/ShippingLabelGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiRequest } from "@/lib/api/client";

interface OrderDetails {
  orderCode?: string;
  status?: string;
  labelUrl?: string;
  trackingNumber?: string;
  price?: { original: { gross: number; net: number; vat: number } };
  courierId?: number;
  serviceType?: string;
  error?: string;
}

export default function TestShippingLabelPage() {
  const [transactionId, setTransactionId] = useState("11111111-1111-1111-1111-111111111111"); // Note: This UUID format is invalid - use a real transaction ID from your database
  const [orderCode, setOrderCode] = useState("311525-25"); // Pre-fill with our test order code
  const [existingLabelUrl, setExistingLabelUrl] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const apiRequest = useApiRequest();

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Shipping Label Generator</CardTitle>
          <CardDescription>
            Test the ShippingLabelGenerator component with different configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter transaction ID (UUID)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderCode">Order Code (optional)</Label>
            <Input
              id="orderCode"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="Enter order code for retrieve functionality"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="existingLabelUrl">Existing Label URL (optional)</Label>
            <Input
              id="existingLabelUrl"
              value={existingLabelUrl}
              onChange={(e) => setExistingLabelUrl(e.target.value)}
              placeholder="Enter existing label URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trackingNumber">Tracking Number (optional)</Label>
            <Input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test: Get Order Details</CardTitle>
          <CardDescription>
            Test fetching order details from Eurosender API to check if label is ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="Enter order code (e.g., 311525-25)"
              className="flex-1"
            />
            <Button
              onClick={async () => {
                if (!orderCode) return;
                setIsLoadingDetails(true);
                try {
                  const response = await apiRequest<{
                    orderCode: string;
                    status: string;
                    labelUrl?: string;
                    trackingNumber?: string;
                    price?: { original: { gross: number; net: number; vat: number } };
                    courierId?: number;
                    serviceType?: string;
                  }>(`/shipping/labels/${orderCode}`);
                  setOrderDetails(response);
                  console.log("[TEST] Order details:", response);
                  if (response.labelUrl) {
                    setExistingLabelUrl(response.labelUrl);
                  }
                  if (response.trackingNumber) {
                    setTrackingNumber(response.trackingNumber);
                  }
                } catch (error) {
                  console.error("[TEST] Error fetching order details:", error);
                  setOrderDetails({ 
                    error: error instanceof Error ? error.message : String(error),
                    orderCode: orderCode 
                  });
                } finally {
                  setIsLoadingDetails(false);
                }
              }}
              disabled={isLoadingDetails || !orderCode}
            >
              {isLoadingDetails ? "Loading..." : "Get Order Details"}
            </Button>
          </div>
          {orderDetails && (
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p><strong>Order Code:</strong> {orderDetails.orderCode || "N/A"}</p>
              <p><strong>Status:</strong> {orderDetails.status || "N/A"}</p>
              <p><strong>Service Type:</strong> {orderDetails.serviceType || "N/A"}</p>
              <p><strong>Courier ID:</strong> {orderDetails.courierId || "N/A"}</p>
              {orderDetails.price && (
                <p><strong>Price:</strong> €{orderDetails.price.original.gross} (net: €{orderDetails.price.original.net}, VAT: €{orderDetails.price.original.vat})</p>
              )}
              <div className="mt-2 pt-2 border-t">
                <p><strong>Label URL:</strong> {orderDetails.labelUrl ? (
                  <span className="text-green-600">✅ {orderDetails.labelUrl}</span>
                ) : (
                  <span className="text-yellow-600">⚠️ Not available yet</span>
                )}</p>
                <p><strong>Tracking Number:</strong> {orderDetails.trackingNumber ? (
                  <span className="text-green-600">✅ {orderDetails.trackingNumber}</span>
                ) : (
                  <span className="text-yellow-600">⚠️ Not available yet</span>
                )}</p>
              </div>
              {orderDetails.error && (
                <p className="text-red-600"><strong>Error:</strong> {orderDetails.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ShippingLabelGenerator
        transactionId={transactionId}
        orderCode={orderCode || undefined}
        existingLabelUrl={existingLabelUrl || undefined}
        trackingNumber={trackingNumber || undefined}
        onLabelGenerated={(url, tracking) => {
          console.log("Label generated:", { url, tracking });
          if (url) setExistingLabelUrl(url);
          if (tracking) setTrackingNumber(tracking);
        }}
      />

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Test Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>⚠️ Important: Setup Test Transaction</strong></p>
                  <p className="text-muted-foreground mb-4">
                    The transaction must exist and you must be the seller. Use this SQL to create/update a test transaction:
                  </p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mb-4">
{`-- First, get your user ID from Clerk dashboard or check current user
-- Then create/update a test transaction where you are the seller:

INSERT INTO public.transactions (
  id,
  listing_type,
  listing_id,
  seller_id,
  buyer_id,
  amount,
  currency,
  status,
  item_amount,
  platform_fee_amount,
  seller_fee_amount,
  seller_payout_amount,
  total_amount
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'sale',
  '00000000-0000-0000-0000-000000000000', -- dummy listing ID
  'YOUR_USER_ID_HERE', -- Replace with your Clerk user ID
  '00000000-0000-0000-0000-000000000001', -- dummy buyer ID
  10000, -- €100.00 in cents
  'EUR',
  'completed',
  10000,
  500, -- 5% platform fee
  100, -- 1% seller fee
  9900, -- seller payout
  10500 -- total
)
ON CONFLICT (id) DO UPDATE SET
  seller_id = EXCLUDED.seller_id,
  status = 'completed';`}
                  </pre>

                  <p><strong>1. Basic Test:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Enter a valid transaction ID where you are the seller</li>
                    <li>Click &quot;Generate Shipping Label&quot;</li>
                    <li>Verify loading state appears</li>
                    <li>Check for success/error toast</li>
                  </ul>
          
          <p className="mt-4"><strong>2. Retrieve Test:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Enter an order code from existing label</li>
            <li>Click &quot;Retrieve Existing Label&quot;</li>
            <li>Verify label URL is loaded</li>
          </ul>
          
          <p className="mt-4"><strong>3. Download Test:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>After generating/retrieving label</li>
            <li>Click &quot;Download Label&quot; button</li>
            <li>Verify PDF opens in new tab</li>
          </ul>
          
          <p className="mt-4"><strong>4. Error Handling Test:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Use invalid transaction ID</li>
            <li>Verify error message appears</li>
            <li>Check error toast notification</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

