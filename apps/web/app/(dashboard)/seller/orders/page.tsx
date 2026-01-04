"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { useApiRequest } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, Truck } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OrderStatus } from "@/lib/services/medusa-order-service";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface Order {
  id: string;
  transactionId: string;
  status: OrderStatus;
  buyerId: string;
  sellerId: string;
  listingId: string;
  listingType: string;
  totalAmount: number;
  currency: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  items: Order[];
  nextCursor: string | null;
}

function SellerOrdersPage() {
  const { user } = useUser();
  const router = useRouter();
  const apiRequest = useApiRequest();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const params = new URLSearchParams({
          sellerId: user.id,
          limit: "20",
        });
        if (statusFilter !== "all") {
          params.append("status", statusFilter);
        }

        const data = await apiRequest<OrdersResponse>(`/orders?${params.toString()}`);
        setOrders(data.items || []);
        setNextCursor(data.nextCursor);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { operation: "fetch_seller_orders" },
          extra: { userId: user.id, statusFilter },
        });
        toast({
          title: "Error",
          description: "Failed to load orders. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    // Intentionally exclude apiRequest/toast - they are stable references and including them causes unnecessary re-fetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, statusFilter]);

  const loadMore = async () => {
    if (!nextCursor || !user?.id || loadingMore) return;

    try {
      setLoadingMore(true);
      const params = new URLSearchParams({
        sellerId: user.id,
        limit: "20",
        cursor: nextCursor,
      });
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const data = await apiRequest<OrdersResponse>(`/orders?${params.toString()}`);
      setOrders((prev) => [...prev, ...(data.items || [])]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: "load_more_seller_orders" },
        extra: { userId: user.id, statusFilter, cursor: nextCursor },
      });
      toast({
        title: "Error",
        description: "Failed to load more orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "completed":
        return "default";
      case "shipped":
      case "delivered":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen pb-20">
        {/* Page Header with Filter */}
        <header className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Manage orders for items you&apos;ve sold
              </p>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 lg:px-8 pt-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Loading State */}
            {loading && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!loading && orders.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No orders found</p>
                  <p className="text-sm text-muted-foreground">
                    {statusFilter === "all"
                      ? "You haven't sold any items yet."
                      : `No orders with status "${statusFilter}".`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Orders List */}
            {!loading && orders.length > 0 && (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:bg-white/5 transition-colors border-border"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Order Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(order.createdAt, 'medium')}
                              </p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">Buyer:</span>
                            <span>{order.buyerId.slice(0, 8)}...</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-semibold">
                              {formatCurrency(order.totalAmount, order.currency, { isMinorUnits: true })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {order.status === "paid" && (
                            <Button
                              variant="brand"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${order.id}#shipping`);
                              }}
                            >
                              <Truck className="h-4 w-4 mr-2" />
                              Manage Shipping
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/orders/${order.id}`);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Load More */}
                {nextCursor && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default SellerOrdersPage;

