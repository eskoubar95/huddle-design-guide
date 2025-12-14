import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useApiRequest } from "@/lib/api/client";
import { toast } from "@/hooks/use-toast";

interface UseDraftJerseyReturn {
  draftJerseyId: string | null;
  isDraftCreated: boolean;
  isSubmitted: boolean;
  createDraft: () => Promise<string | null>;
  cleanupDraft: () => Promise<void>;
  markSubmitted: () => void;
  reset: () => void;
}

export function useDraftJersey(): UseDraftJerseyReturn {
  const { getToken } = useAuth();
  const apiRequest = useApiRequest();
  const [draftJerseyId, setDraftJerseyId] = useState<string | null>(null);
  const [isDraftCreated, setIsDraftCreated] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const createDraft = useCallback(async (): Promise<string | null> => {
    if (isDraftCreated) return draftJerseyId;

    try {
      // Ensure we have a token before making request
      const token = await getToken();
      if (!token) {
        console.error("Failed to get authentication token - user may not be signed in");
        toast({
          title: "Authentication Required",
          description: "Please sign in to upload a jersey.",
          variant: "destructive",
        });
        return null;
      }

      const response = await apiRequest<{ jerseyId: string; status: string }>(
        "/jerseys/create-draft",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setDraftJerseyId(response.jerseyId);
      setIsDraftCreated(true);
      return response.jerseyId;
    } catch (error) {
      console.error("Failed to create draft jersey:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to initialize upload. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("Invalid token") || error.message.includes("UNAUTHORIZED")) {
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (error.message.includes("429")) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }, [isDraftCreated, draftJerseyId, getToken, apiRequest]);

  const cleanupDraft = useCallback(async (): Promise<void> => {
    if (!draftJerseyId || isSubmitted) return;

    try {
      const token = await getToken();
      if (!token) return;

      await apiRequest(`/jerseys/cancel-draft/${draftJerseyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Failed to cleanup draft:", error);
      // Don't show error to user - cleanup is non-critical
    }
  }, [draftJerseyId, isSubmitted, getToken, apiRequest]);

  const markSubmitted = useCallback(() => {
    setIsSubmitted(true);
  }, []);

  const reset = useCallback(() => {
    setDraftJerseyId(null);
    setIsDraftCreated(false);
    setIsSubmitted(false);
  }, []);

  return {
    draftJerseyId,
    isDraftCreated,
    isSubmitted,
    createDraft,
    cleanupDraft,
    markSubmitted,
    reset,
  };
}

