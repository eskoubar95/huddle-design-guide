import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {title && <ToastTitle>{title as any}</ToastTitle>}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {description && <ToastDescription>{description as any}</ToastDescription>}
            </div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {action as any}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
