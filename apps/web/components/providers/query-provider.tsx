'use client'

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

// Wrapper component to handle React 19 type compatibility
function QueryClientProviderWrapper({ 
  client, 
  children 
}: { 
  client: QueryClient; 
  children: ReactNode;
}) {
  // Type assertion to handle React 19 type compatibility with @tanstack/react-query
  // React 19's ReactNode type is stricter than what @tanstack/react-query expects
  // Using double type assertion via variable to bypass type checking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childrenAsAny = children as any;
  
  return (
    <QueryClientProvider client={client}>
      {childrenAsAny}
    </QueryClientProvider>
  );
}

/**
 * Redirect to auth page when token is expired or invalid
 * Only runs on client-side
 */
function redirectToAuth(currentPath?: string): void {
  if (typeof window === "undefined") return;

  const authUrl = new URL("/auth", window.location.origin);
  if (currentPath) {
    authUrl.searchParams.set("redirect_url", currentPath);
  } else {
    authUrl.searchParams.set("redirect_url", window.location.pathname);
  }
  window.location.href = authUrl.toString();
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Use useState to create QueryClient once per component instance
  // This prevents creating new client on every render (Next.js App Router requirement)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 401 errors - redirect to auth instead
              if (error && typeof error === 'object' && 'statusCode' in error) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode === 401) {
                  redirectToAuth();
                  return false;
                }
              }
              // Retry other errors up to 3 times
              return failureCount < 3;
            },
            onError: (error) => {
              // Handle 401 errors globally
              if (error && typeof error === 'object' && 'statusCode' in error) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode === 401) {
                  redirectToAuth();
                }
              }
            },
          },
          mutations: {
            retry: (failureCount, error) => {
              // Don't retry on 401 errors - redirect to auth instead
              if (error && typeof error === 'object' && 'statusCode' in error) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode === 401) {
                  redirectToAuth();
                  return false;
                }
              }
              // Don't retry mutations by default
              return false;
            },
            onError: (error) => {
              // Handle 401 errors globally
              if (error && typeof error === 'object' && 'statusCode' in error) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode === 401) {
                  redirectToAuth();
                }
              }
            },
          },
        },
      })
  );

  return (
    <QueryClientProviderWrapper client={queryClient}>
      {children}
    </QueryClientProviderWrapper>
  );
}

