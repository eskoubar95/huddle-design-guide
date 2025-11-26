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

