"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

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
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        redirectToAuth();
        throw new ApiClientError(
          "UNAUTHORIZED",
          "Authentication required. Redirecting to sign in...",
          401
        );
      }

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
 *
 * Automatically handles token refresh and redirects on 401 errors
 *
 * IMPORTANT: Returns a stable function reference via useCallback to prevent
 * infinite loops when used in useEffect dependencies
 */
export function useApiRequest() {
  const { getToken, isLoaded, userId } = useAuth();

  const makeRequest = useCallback(
    async <T,>(endpoint: string, options?: RequestInit): Promise<T> => {
      // Wait for auth to be loaded
      if (!isLoaded) {
        throw new ApiClientError(
          "AUTH_NOT_LOADED",
          "Authentication is still loading. Please wait.",
          0
        );
      }

      // Check if user is signed in
      if (!userId) {
        redirectToAuth();
        throw new ApiClientError(
          "UNAUTHORIZED",
          "You must be signed in to perform this action.",
          401
        );
      }

      // Get token with skipCache to ensure fresh token
      // This helps catch expired tokens early
      const token = await getToken({ skipCache: true });
      if (!token) {
        redirectToAuth();
        throw new ApiClientError(
          "TOKEN_ERROR",
          "Failed to get authentication token. Please sign in again.",
          401
        );
      }

      try {
        return await apiRequest<T>(endpoint, { ...options, token });
      } catch (error) {
        // Re-throw 401 errors (already handled redirect in apiRequest)
        if (error instanceof ApiClientError && error.statusCode === 401) {
          throw error;
        }
        // Re-throw all other errors
        throw error;
      }
    },
    [getToken, isLoaded, userId]
  );

  return makeRequest;
}

