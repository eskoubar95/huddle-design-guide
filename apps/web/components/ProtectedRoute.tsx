'use client'

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  // Track mounted state to prevent hydration mismatch
  // This pattern is required for SSR hydration safety in Next.js
  // The setState in effect is intentional and necessary for proper hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is authenticated and token is valid
  useEffect(() => {
    let isCancelled = false;

    const checkAuth = async () => {
      if (!isLoaded) {
        if (!isCancelled) {
          setIsCheckingToken(true);
        }
        return;
      }

      if (!user) {
        // No user - redirect to auth
        if (!isCancelled) {
          const authUrl = new URL("/auth", window.location.origin);
          authUrl.searchParams.set("redirect_url", pathname || "/");
          window.location.href = authUrl.toString();
        }
        return;
      }

      // User exists - verify token is valid
      // Use skipCache to ensure we get a fresh token check
      try {
        const token = await getToken({ skipCache: true });
        if (isCancelled) return;

        if (!token) {
          // No token - redirect to auth
          const authUrl = new URL("/auth", window.location.origin);
          authUrl.searchParams.set("redirect_url", pathname || "/");
          window.location.href = authUrl.toString();
          return;
        }
        setIsCheckingToken(false);
      } catch (error) {
        // Token error - redirect to auth
        // Only log in development to avoid console spam
        if (isCancelled) return;

        if (process.env.NODE_ENV === "development") {
          console.error("[ProtectedRoute] Token check failed:", error);
        }
        const authUrl = new URL("/auth", window.location.origin);
        authUrl.searchParams.set("redirect_url", pathname || "/");
        window.location.href = authUrl.toString();
      }
    };

    checkAuth();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [user, isLoaded, getToken, pathname]);

  // During SSR and initial hydration, render children to match server output
  // Only show loading state after component is mounted on client
  if (!mounted) {
    return <>{children}</>;
  }

  if (!isLoaded || isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
            aria-label="Loading"
          />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};


