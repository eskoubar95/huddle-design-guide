"use client";

import { useState, FormEvent, useMemo } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CreditCard, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy-loaded Stripe promise to ensure env vars are available
let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error("[PaymentElementForm] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set!");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

interface PaymentFormProps {
  /** Amount in cents for display */
  amountCents: number;
  /** Currency code (e.g., "EUR") */
  currency: string;
  /** Called when payment is successful */
  onSuccess: () => void;
  /** Called when payment fails with an error message */
  onError?: (error: string) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Return URL for redirect-based payment methods */
  returnUrl?: string;
}

function PaymentForm({
  amountCents,
  currency,
  onSuccess,
  onError,
  disabled = false,
  returnUrl,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/checkout/success`,
        },
        redirect: "if_required",
      });

      if (submitError) {
        const errorMessage = submitError.message || "Payment failed. Please try again.";
        setError(errorMessage);
        onError?.(errorMessage);

        // Add breadcrumb: Payment failed (no PII)
        Sentry.addBreadcrumb({
          category: "checkout.payment",
          message: "Payment submission failed",
          level: "error",
          data: {
            errorType: submitError.type || "unknown",
            errorCode: submitError.code || "unknown",
            amountCents,
            currency,
            // No PII - Stripe handles card data securely
          },
        });

        // Capture exception
        Sentry.captureException(submitError, {
          tags: {
            component: "payment_element_form",
            operation: "confirm_payment",
          },
          extra: {
            errorType: submitError.type,
            errorCode: submitError.code,
            amountCents,
            currency,
            // No PII
          },
        });
      } else {
        // Payment succeeded without redirect
        // Add breadcrumb: Payment successful
        Sentry.addBreadcrumb({
          category: "checkout.payment",
          message: "Payment confirmed successfully",
          level: "info",
          data: {
            amountCents,
            currency,
            // No PII - payment details handled securely by Stripe
          },
        });

        onSuccess();
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      onError?.(errorMessage);

      // Add breadcrumb: Unexpected error
      Sentry.addBreadcrumb({
        category: "checkout.payment",
        message: "Unexpected error during payment",
        level: "error",
        data: {
          errorType: err instanceof Error ? err.constructor.name : "UnknownError",
          amountCents,
          currency,
          // No PII
        },
      });

      // Capture exception
      Sentry.captureException(err, {
        tags: {
          component: "payment_element_form",
          operation: "confirm_payment",
        },
        extra: {
          amountCents,
          currency,
          // No PII
        },
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (cents: number, curr: string) => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: curr.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card", "paypal", "klarna"],
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || processing || disabled}
        className={cn(
          "w-full h-12 text-base font-semibold transition-all",
          "bg-green-600 hover:bg-green-500 text-white",
          (processing || disabled) && "opacity-50 cursor-not-allowed"
        )}
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Pay {formatAmount(amountCents, currency)}
          </>
        )}
      </Button>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <CreditCard className="h-4 w-4" />
        <span>Secured by Stripe. Your payment info is encrypted.</span>
      </div>
    </form>
  );
}

export interface PaymentElementFormProps {
  /** Stripe client secret from the Payment Intent */
  clientSecret: string;
  /** Amount in cents for display */
  amountCents: number;
  /** Currency code (e.g., "EUR") */
  currency: string;
  /** Called when payment is successful */
  onSuccess: () => void;
  /** Called when payment fails with an error message */
  onError?: (error: string) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Return URL for redirect-based payment methods */
  returnUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

export function PaymentElementForm({
  clientSecret,
  amountCents,
  currency,
  onSuccess,
  onError,
  disabled = false,
  returnUrl,
  className,
}: PaymentElementFormProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#22c55e", // green-500
        colorBackground: "#18181b", // zinc-900
        colorText: "#fafafa", // zinc-50
        colorDanger: "#ef4444", // red-500
        fontFamily: "system-ui, sans-serif",
        borderRadius: "8px",
        spacingUnit: "4px",
      },
      rules: {
        ".Input": {
          backgroundColor: "#27272a", // zinc-800
          border: "1px solid #3f3f46", // zinc-700
        },
        ".Input:focus": {
          border: "1px solid #22c55e", // green-500
          boxShadow: "0 0 0 1px #22c55e",
        },
        ".Tab": {
          backgroundColor: "#27272a",
          border: "1px solid #3f3f46",
        },
        ".Tab--selected": {
          backgroundColor: "#22c55e",
          border: "1px solid #22c55e",
        },
        ".Label": {
          color: "#a1a1aa", // zinc-400
        },
      },
    },
  };

  // Lazily get Stripe instance
  const stripe = useMemo(() => getStripe(), []);

  if (!clientSecret) {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        <div className="h-32 bg-zinc-800 rounded-lg" />
        <div className="h-12 bg-zinc-800 rounded-lg" />
      </div>
    );
  }

  // Show error if Stripe key is missing
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className={cn("p-4 bg-red-500/10 border border-red-500/20 rounded-lg", className)}>
        <div className="flex items-start gap-2 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Payment configuration error</p>
            <p className="text-sm text-red-400/80 mt-1">
              Stripe is not configured. Please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Elements stripe={stripe} options={options}>
        <PaymentForm
          amountCents={amountCents}
          currency={currency}
          onSuccess={onSuccess}
          onError={onError}
          disabled={disabled}
          returnUrl={returnUrl}
        />
      </Elements>
    </div>
  );
}

export default PaymentElementForm;


