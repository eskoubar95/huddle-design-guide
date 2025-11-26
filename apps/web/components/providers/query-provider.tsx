'use client'

import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

  // Type assertion to handle React 19 type compatibility with @tanstack/react-query
  return (
    <QueryClientProvider client={queryClient}>
      {children as React.ReactNode}
    </QueryClientProvider>
  );
}

