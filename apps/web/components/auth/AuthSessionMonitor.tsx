'use client'

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

/**
 * Monitors authentication session and handles token expiration
 * Shows toast notification when session is about to expire or has expired
 * Implements periodic token refresh to catch expired tokens early
 */
export function AuthSessionMonitor() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownExpiredToastRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    // Check token validity every 5 minutes
    // This helps catch expired tokens before they cause API errors
    const checkToken = async () => {
      try {
        // Use skipCache to get fresh token status
        const token = await getToken({ skipCache: true });
        
        if (!token) {
          // Token is missing or expired
          if (!hasShownExpiredToastRef.current) {
            hasShownExpiredToastRef.current = true;
            toast({
              title: "Session expired",
              description: "Your session has expired. Redirecting to sign in...",
              variant: "destructive",
            });

            // Redirect after a short delay to allow toast to be seen
            setTimeout(() => {
              const authUrl = new URL("/auth", window.location.origin);
              authUrl.searchParams.set("redirect_url", window.location.pathname);
              window.location.href = authUrl.toString();
            }, 2000);
          }
          return;
        }

        // Token is valid - reset expired toast flag
        hasShownExpiredToastRef.current = false;
      } catch {
        // Token check failed
        if (!hasShownExpiredToastRef.current) {
          hasShownExpiredToastRef.current = true;
          toast({
            title: "Authentication error",
            description: "Unable to verify your session. Redirecting to sign in...",
            variant: "destructive",
          });

          setTimeout(() => {
            const authUrl = new URL("/auth", window.location.origin);
            authUrl.searchParams.set("redirect_url", window.location.pathname);
            window.location.href = authUrl.toString();
          }, 2000);
        }
      }
    };

    // Initial check
    checkToken();

    // Set up periodic check (every 5 minutes)
    heartbeatIntervalRef.current = setInterval(checkToken, 5 * 60 * 1000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user, isLoaded, getToken, toast, router]);

  // This component doesn't render anything
  return null;
}

