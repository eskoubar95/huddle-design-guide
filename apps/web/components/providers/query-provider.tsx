'use client'

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
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

  // Workaround for React 19 type compatibility with @tanstack/react-query
  // React 19's ReactNode type is stricter than what @tanstack/react-query expects
  // Using double type assertion to satisfy both type systems
  return (
    <QueryClientProvider client={queryClient}>
      {children as unknown as React.ReactNode}
    </QueryClientProvider>
  );
}

