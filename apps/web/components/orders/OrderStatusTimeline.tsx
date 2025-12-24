"use client";

import { OrderStatus } from "@/lib/services/medusa-order-service";
import { CheckCircle2, Circle, Package, Truck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  statusHistory?: Array<{ status: OrderStatus; timestamp: string }>;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: {
    label: "Pending",
    icon: Circle,
    color: "text-muted-foreground",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    color: "text-blue-500",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    color: "text-orange-500",
  },
  delivered: {
    label: "Delivered",
    icon: Package,
    color: "text-purple-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-destructive",
  },
};

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "completed",
];

export function OrderStatusTimeline({
  currentStatus,
  statusHistory = [],
}: OrderStatusTimelineProps) {
  // Build status progression based on current status
  const getStatusProgression = (): Array<{
    status: OrderStatus;
    completed: boolean;
    timestamp?: string;
  }> => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    const progression: Array<{
      status: OrderStatus;
      completed: boolean;
      timestamp?: string;
    }> = [];

    // Add all statuses up to current
    for (let i = 0; i <= currentIndex && i < STATUS_ORDER.length; i++) {
      const status = STATUS_ORDER[i];
      const historyEntry = statusHistory.find((h) => h.status === status);
      progression.push({
        status,
        completed: true,
        timestamp: historyEntry?.timestamp,
      });
    }

    // Add cancelled if current status is cancelled
    if (currentStatus === "cancelled") {
      const cancelledHistory = statusHistory.find((h) => h.status === "cancelled");
      progression.push({
        status: "cancelled",
        completed: true,
        timestamp: cancelledHistory?.timestamp,
      });
    }

    return progression;
  };

  const progression = getStatusProgression();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Order Status</h3>
      <div className="relative">
        <div className="flex flex-col gap-4">
          {progression.map((item, index) => {
            const config = STATUS_CONFIG[item.status];
            const Icon = config.icon;
            const isLast = index === progression.length - 1;
            const isCurrent = item.status === currentStatus;

            return (
              <div key={item.status} className="relative flex items-start gap-4">
                {/* Timeline line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[11px] top-8 h-full w-0.5",
                      item.completed ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2",
                    item.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background",
                    isCurrent && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <Icon className="h-3 w-3" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {config.label}
                    </p>
                    {isCurrent && (
                      <span className="text-xs text-muted-foreground">(Current)</span>
                    )}
                  </div>
                  {item.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

