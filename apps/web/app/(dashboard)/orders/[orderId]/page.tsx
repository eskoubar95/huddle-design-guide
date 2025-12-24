"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useApiRequest } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { OrderStatus } from "@/lib/services/medusa-order-service";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  ArrowLeft,
  Truck,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { JerseyImageWithLoading } from "@/components/jersey/JerseyImageWithLoading";

interface OrderDetailResponse {
  order: {
    id: string;
    status: OrderStatus;
    created_at: string;
    updated_at: string;
    shipping_address: {
      street: string;
      city: string;
      postal_code: string;
      country: string;
      state?: string;
      address_line2?: string;
      phone?: string;
      first_name?: string;
      last_name?: string;
    };
    shipping_method?: string;
    shipping_cost?: number;
    totals: {
      subtotal: number;
      shipping: number;
      total: number;
    };
  };
  transaction: {
    id: string;
    medusa_order_id: string;
    buyer_id: string;
    seller_id: string;
    item_amount: number;
    shipping_amount: number;
    platform_fee_amount: number;
    seller_fee_amount: number;
    seller_payout_amount: number;
    total_amount: number;
    currency: string;
    stripe_payment_intent_id: string;
    stripe_transfer_id: string | null;
    completed_at: string | null;
  } | null;
  jersey: {
    id: string;
    images: string[];
    club: string;
    season: string;
    jersey_type: string;
    player_name?: string | null;
  } | null;
  shippingLabel: {
    tracking_number: string | null;
    label_url: string;
    shipping_provider: string | null;
  } | null;
  tracking: {
    number: string | null;
    provider: string | null;
    url: string | null;
  };
}

function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useUser();
  const apiRequest = useApiRequest();
  const { toast } = useToast();
  const orderId = params.orderId || "";

  const [orderData, setOrderData] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingProvider, setShippingProvider] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await apiRequest<OrderDetailResponse>(`/orders/${orderId}`);
        setOrderData(data);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        toast({
          title: "Error",
          description: "Failed to load order details. Please try again.",
          variant: "destructive",
        });
        router.push("/purchases");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, apiRequest, toast, router]);

  const handleShip = async () => {
    if (!trackingNumber.trim() || !shippingProvider.trim()) {
      toast({
        title: "Validation Error",
        description: "Tracking number and shipping provider are required",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      await apiRequest(`/orders/${orderId}/ship`, {
        method: "POST",
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          shippingProvider: shippingProvider.trim(),
        }),
      });

      toast({
        title: "Success",
        description: "Order marked as shipped",
      });

      setShipDialogOpen(false);
      setTrackingNumber("");
      setShippingProvider("");

      // Refresh order data
      const data = await apiRequest<OrderDetailResponse>(`/orders/${orderId}`);
      setOrderData(data);
    } catch (error) {
      console.error("Failed to ship order:", error);
      toast({
        title: "Error",
        description: "Failed to mark order as shipped. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      await apiRequest(`/orders/${orderId}/complete`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Order marked as completed",
      });

      // Refresh order data
      const data = await apiRequest<OrderDetailResponse>(`/orders/${orderId}`);
      setOrderData(data);
    } catch (error) {
      console.error("Failed to complete order:", error);
      toast({
        title: "Error",
        description: "Failed to mark order as completed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await apiRequest(`/orders/${orderId}/cancel`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Order cancelled",
      });

      setCancelDialogOpen(false);

      // Refresh order data
      const data = await apiRequest<OrderDetailResponse>(`/orders/${orderId}`);
      setOrderData(data);
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderData || !orderData.order || !orderData.transaction) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Order not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { order, transaction, jersey, tracking } = orderData;
  const isSeller = transaction.seller_id === user?.id;
  const isBuyer = transaction.buyer_id === user?.id;
  const canShip = isSeller && order.status === "paid";
  const canComplete = isBuyer && order.status === "shipped";
  const canCancel =
    (isBuyer && order.status !== "shipped" && order.status !== "completed") ||
    (isSeller && order.status !== "completed");

  const jerseyImages = jersey?.images || [];
  const primaryImage = jerseyImages.length > 0 ? jerseyImages[0] : null;

  return (
    <ProtectedRoute>
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-sm text-muted-foreground">
              Order ID: {order.id.slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {jersey && (
                  <div className="flex gap-4">
                    {primaryImage && (
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border">
                        <JerseyImageWithLoading
                          src={primaryImage}
                          alt={`${jersey.club} ${jersey.season}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {jersey.club} {jersey.season}
                      </h3>
                      {jersey.player_name && (
                        <p className="text-sm text-muted-foreground">
                          {jersey.player_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {jersey.jersey_type}
                      </p>
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Item Price</span>
                    <span>{formatCurrency(transaction.item_amount, transaction.currency, { isMinorUnits: true })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {formatCurrency(
                        transaction.shipping_amount || 0,
                        transaction.currency,
                        { isMinorUnits: true }
                      )}
                    </span>
                  </div>
                  {transaction.platform_fee_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span>
                        {formatCurrency(
                          transaction.platform_fee_amount,
                          transaction.currency,
                          { isMinorUnits: true }
                        )}
                      </span>
                    </div>
                  )}
                  {isSeller && transaction.seller_fee_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Seller Fee</span>
                      <span>
                        {formatCurrency(
                          transaction.seller_fee_amount,
                          transaction.currency,
                          { isMinorUnits: true }
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(transaction.total_amount, transaction.currency, { isMinorUnits: true })}</span>
                  </div>
                  {isSeller && transaction.seller_payout_amount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Your Payout</span>
                      <span>
                        {formatCurrency(
                          transaction.seller_payout_amount,
                          transaction.currency,
                          { isMinorUnits: true }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Shipping Address</h4>
                  <p className="text-sm">
                    {order.shipping_address.first_name} {order.shipping_address.last_name}
                    <br />
                    {order.shipping_address.street}
                    {order.shipping_address.address_line2 && (
                      <>
                        <br />
                        {order.shipping_address.address_line2}
                      </>
                    )}
                    <br />
                    {order.shipping_address.postal_code} {order.shipping_address.city}
                    {order.shipping_address.state && `, ${order.shipping_address.state}`}
                    <br />
                    {order.shipping_address.country}
                    {order.shipping_address.phone && (
                      <>
                        <br />
                        {order.shipping_address.phone}
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Shipping Method</h4>
                  <p className="text-sm">{order.shipping_method || "Standard Shipping"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(
                      order.shipping_cost || transaction.shipping_amount || 0,
                      transaction.currency,
                      { isMinorUnits: true }
                    )}
                  </p>
                </div>

                {tracking.number && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Tracking</h4>
                    <p className="text-sm">
                      <span className="font-medium">{tracking.number}</span>
                      {tracking.provider && (
                        <span className="text-muted-foreground ml-2">
                          ({tracking.provider})
                        </span>
                      )}
                    </p>
                    {tracking.url && (
                      <a
                        href={tracking.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Track Package <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs">{transaction.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Intent</span>
                  <span className="font-mono text-xs">
                    {transaction.stripe_payment_intent_id.slice(0, 8)}...
                  </span>
                </div>
                {transaction.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date</span>
                    <span>{formatDateTime(transaction.completed_at)}</span>
                  </div>
                )}
                {isSeller && transaction.stripe_transfer_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfer ID</span>
                    <span className="font-mono text-xs">
                      {transaction.stripe_transfer_id.slice(0, 8)}...
                    </span>
                  </div>
                )}
                {process.env.NEXT_PUBLIC_MEDUSA_ADMIN_URL && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Medusa Order</span>
                    <a
                      href={`${process.env.NEXT_PUBLIC_MEDUSA_ADMIN_URL}/orders/${order.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View in Medusa <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderStatusTimeline
                  currentStatus={order.status}
                  statusHistory={[
                    { status: order.status, timestamp: order.updated_at },
                  ]}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            {(canShip || canComplete || canCancel) && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {canShip && (
                    <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" variant="brand">
                          <Truck className="h-4 w-4 mr-2" />
                          Mark as Shipped
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Mark Order as Shipped</DialogTitle>
                          <DialogDescription>
                            Enter tracking information for this order.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="tracking">Tracking Number</Label>
                            <Input
                              id="tracking"
                              value={trackingNumber}
                              onChange={(e) => setTrackingNumber(e.target.value)}
                              placeholder="Enter tracking number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="provider">Shipping Provider</Label>
                            <Input
                              id="provider"
                              value={shippingProvider}
                              onChange={(e) => setShippingProvider(e.target.value)}
                              placeholder="e.g., Eurosender, DHL, PostNord"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShipDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="brand"
                            onClick={handleShip}
                            disabled={actionLoading}
                          >
                            {actionLoading && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Ship Order
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {canComplete && (
                    <Button
                      className="w-full"
                      variant="brand"
                      onClick={handleComplete}
                      disabled={actionLoading}
                    >
                      {actionLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  )}

                  {canCancel && (
                    <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" variant="destructive">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Order
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel this order? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>No, keep order</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancel}
                            disabled={actionLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {actionLoading && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Yes, cancel order
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default OrderDetailPage;

