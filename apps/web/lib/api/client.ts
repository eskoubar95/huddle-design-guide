"use client";

import { useAuth } from "@clerk/nextjs";

/**
 * API Client Error
 * Thrown when API requests fail
 */
export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Make API request with Clerk authentication
 * Client-side only - use in React components
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  try {
    const token = options?.token;

    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { code: "UNKNOWN_ERROR", message: "API request failed" },
      }));

      throw new ApiClientError(
        error.error?.code || "API_ERROR",
        error.error?.message || "API request failed",
        response.status
      );
    }

    if (response.status === 204) return null as T;
    return response.json();
  } catch (error) {
    if (error instanceof ApiClientError) throw error;

    // Network errors or other fetch failures
    throw new ApiClientError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "Failed to connect to API",
      0
    );
  }
}

/**
 * Hook to get API request function with Clerk token
 * Use this in React components
 */
export function useApiRequest() {
  const { getToken, isLoaded } = useAuth();

  return async <T,>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> => {
    // Only get token if auth is loaded
    const token = isLoaded ? await getToken() : null;
    return apiRequest<T>(endpoint, { ...options, token: token || undefined });
  };
}

