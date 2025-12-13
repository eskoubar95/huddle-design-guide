'use client'

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface VerificationStatus {
  status: 'verified' | 'pending' | 'rejected' | null;
  verificationId: string | null;
  lastUpdated: string | null;
}

export default function VerifyIdentityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isRequestingReview, setIsRequestingReview] = useState(false);

  const redirectUrl = searchParams?.get("redirect_url") || "/marketplace";
  const sessionComplete = searchParams?.get("session_complete") === "true";

  // Fetch current verification status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!authLoaded) return;

      try {
        const token = await getToken();
        if (!token) {
          console.error("No authentication token available");
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/v1/profile/verification-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch verification status:", errorData.error?.message || response.statusText);
        }
      } catch (error) {
        console.error("Error fetching verification status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [authLoaded, getToken]);

  // Show success message if redirected from Stripe
  useEffect(() => {
    if (sessionComplete && status?.status === "pending") {
      toast({
        title: "Verification Submitted",
        description: "Your identity verification is being processed. We'll notify you when it's complete.",
      });
    }
  }, [sessionComplete, status?.status, toast]);

  const handleStartVerification = async () => {
    setIsStarting(true);
    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        setIsStarting(false);
        return;
      }

      const response = await fetch("/api/v1/profile/identity/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `Failed to start verification (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // If session already exists (pending/verified)
      if (data.status === "already_verified") {
        toast({
          title: "Already Verified",
          description: "Your identity is already verified.",
        });
        setStatus((prev) => prev ? { ...prev, status: 'verified' } : null);
        return;
      }

      if (data.status === "already_pending") {
        toast({
          title: "Verification Pending",
          description: "Your identity verification is already in progress.",
        });
        setStatus((prev) => prev ? { ...prev, status: 'pending' } : null);
        return;
      }

      // Redirect to Stripe Identity verification page
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No verification URL received");
      }
    } catch (error) {
      console.error("Verification start error:", error);
      
      // Extract error message from API response
      let errorMessage = "Failed to start verification. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Check if it's a configuration error
      if (errorMessage.includes("not configured") || errorMessage.includes("not available")) {
        errorMessage = "Identity verification is currently unavailable. Please contact support or try again later.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleRequestReview = async () => {
    setIsRequestingReview(true);
    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        setIsRequestingReview(false);
        return;
      }

      const response = await fetch("/api/v1/profile/identity/request-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "Please review my identity verification. I believe there may have been an error.",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to submit review request");
      }

      toast({
        title: "Review Request Submitted",
        description: "We've received your request. Our team will review your case and notify you of the outcome.",
      });
    } catch (error) {
      console.error("Review request error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit review request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingReview(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const verificationStatus = status?.status || null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Identity Verification</h1>
            <p className="text-muted-foreground">
              Verify your identity to start selling on the marketplace
            </p>
          </div>

          {verificationStatus === 'verified' && (
            <Card className="border-green-500/50 bg-green-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <CardTitle className="text-green-600">Identity Verified</CardTitle>
                    <CardDescription>
                      Your identity has been successfully verified. You can now sell on the marketplace.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push(redirectUrl)}>
                  Continue to Marketplace
                </Button>
              </CardContent>
            </Card>
          )}

          {verificationStatus === 'pending' && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <CardTitle className="text-yellow-600">Verification Pending</CardTitle>
                    <CardDescription>
                      Your identity verification is currently being processed. This usually takes a few minutes.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  We'll send you a notification once your verification is complete. You can check back here anytime.
                </p>
                <Button variant="outline" onClick={() => router.push(redirectUrl)}>
                  Go to Marketplace
                </Button>
              </CardContent>
            </Card>
          )}

          {verificationStatus === 'rejected' && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <CardTitle className="text-red-600">Verification Rejected</CardTitle>
                    <CardDescription>
                      Your identity verification was not approved. You can request a review or try again.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>What happens next?</AlertTitle>
                  <AlertDescription>
                    If you believe there was an error, you can request a manual review. Otherwise, you can start a new verification attempt.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3">
                  <Button
                    onClick={handleRequestReview}
                    disabled={isRequestingReview}
                    variant="outline"
                  >
                    {isRequestingReview ? "Submitting..." : "Request Review"}
                  </Button>
                  <Button
                    onClick={handleStartVerification}
                    disabled={isStarting}
                  >
                    {isStarting ? "Starting..." : "Try Again"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {verificationStatus === null && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle>Identity Verification Required</CardTitle>
                    <CardDescription>
                      To sell items on the marketplace, you need to verify your identity. This is a quick and secure process.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>What you'll need</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>A government-issued ID (driver's license, passport, or national ID)</li>
                      <li>A device with a camera for a selfie</li>
                      <li>Approximately 2-3 minutes of your time</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleStartVerification}
                  disabled={isStarting}
                  size="lg"
                  className="w-full"
                >
                  {isStarting ? "Starting Verification..." : "Start Verification"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
