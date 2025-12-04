import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { UseFormSetValue } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import type { JerseyCreateInput } from "@/lib/validation/jersey-schemas";

export interface AIVisionResults {
  club?: string;
  season?: string;
  jerseyType?: string;
  playerName?: string;
  playerNumber?: string;
  clubId?: string;
  seasonId?: string;
  playerId?: string;
  hasPlayerPrint?: boolean; // Whether the jersey has player name/number on the back
  confidence?: number;
  // Enhanced confidence information
  confidenceDetails?: {
    club: number;
    season: number;
    player: number;
    overall: number;
  };
  // Suggestions for low confidence fields
  suggestions?: {
    clubs?: Array<{ id: string; name: string; confidence: number }>;
    seasons?: Array<{ id: string; label: string; confidence: number }>;
    players?: Array<{ id: string; name: string; jerseyNumber?: number; confidence: number }>;
  };
  // Fields that are missing and need manual input
  missingFields?: string[]; // e.g., ['club', 'season', 'player']
}

interface UseJerseyVisionAIReturn {
  enableAI: boolean;
  aiResults: AIVisionResults | null;
  isAnalyzing: boolean;
  aiSkippedSteps: boolean;
  setEnableAI: (enabled: boolean) => void;
  analyzeImages: (
    draftJerseyId: string,
    userId: string,
    imageUrls: string[],
    formSetValue: UseFormSetValue<Omit<JerseyCreateInput, "images">>,
    formGetValues: () => Omit<JerseyCreateInput, "images">,
    onMetadataChange: (clubId?: string, seasonId?: string, playerId?: string) => void
  ) => Promise<void>;
  reset: () => void;
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  }
  return url;
}

const CONFIDENCE_THRESHOLD = 70;

/**
 * Map Vision API kit types to frontend jersey types
 * Vision API returns: "Home", "Away", "Third", "Goalkeeper", "Special"
 * Frontend expects: "Home", "Away", "Third", "Fourth", "Special Edition", "GK Home", "GK Away", "GK Third"
 */
function mapKitTypeToJerseyType(kitType: string | null | undefined): string | null {
  if (!kitType) return null;
  
  const normalized = kitType.trim();
  
  // Direct matches
  if (normalized === "Home" || normalized === "Away" || normalized === "Third") {
    return normalized;
  }
  
  // Map "Goalkeeper" to "GK Home" (default, user can change if needed)
  if (normalized === "Goalkeeper") {
    return "GK Home";
  }
  
  // Map "Special" to "Special Edition"
  if (normalized === "Special") {
    return "Special Edition";
  }
  
  // Return null if no match (shouldn't happen with current Vision API)
  return null;
}

export function useJerseyVisionAI(): UseJerseyVisionAIReturn {
  const { getToken } = useAuth();
  const [enableAI, setEnableAI] = useState(false);
  const [aiResults, setAiResults] = useState<AIVisionResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSkippedSteps, setAiSkippedSteps] = useState(false);

  const analyzeImages = useCallback(
    async (
      draftJerseyId: string,
      userId: string,
      imageUrls: string[],
      formSetValue: UseFormSetValue<Omit<JerseyCreateInput, "images">>,
      formGetValues: () => Omit<JerseyCreateInput, "images">,
      onMetadataChange: (clubId?: string, seasonId?: string, playerId?: string) => void
    ): Promise<void> => {
      if (!draftJerseyId || !userId || imageUrls.length === 0) return;

      setIsAnalyzing(true);
      try {
        const token = await getToken();
        if (!token) {
          console.error("[Vision AI] No token available");
          return;
        }

        const supabaseUrl = getSupabaseUrl();
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseAnonKey) {
          throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
        }

        console.log("[Vision AI] Calling analyze-jersey-vision", {
          jerseyId: draftJerseyId,
          imageCount: imageUrls.length,
          userId,
        });

        const response = await fetch(`${supabaseUrl}/functions/v1/analyze-jersey-vision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`, // Supabase anon key for Edge Function access
            "X-Clerk-Token": token, // Clerk token in custom header
          },
          body: JSON.stringify({
            jerseyId: draftJerseyId,
            imageUrls,
            userId,
          }),
        });

        console.log("[Vision AI] Response status:", response.status);

        if (response.ok) {
          const apiResponse = await response.json();
          
          console.log('[Vision AI] API Response:', {
            hasMetadata: !!apiResponse.metadata,
            metadata: apiResponse.metadata,
            matched: apiResponse.matched,
          });
          
          // Map API response to internal AIVisionResults format
          const confidenceDetails = apiResponse.confidence || {
            club: 0,
            season: 0,
            player: 0,
            overall: 0,
          };

          const results: AIVisionResults = {
            club: apiResponse.metadata?.clubName || apiResponse.vision?.clubText || undefined,
            season: apiResponse.metadata?.seasonLabel || apiResponse.vision?.seasonText || undefined,
            jerseyType: apiResponse.vision?.kitType || undefined,
            playerName: apiResponse.metadata?.playerName || apiResponse.vision?.playerNameText || undefined,
            playerNumber: apiResponse.vision?.playerNumberText || undefined,
            clubId: apiResponse.matched?.clubId || undefined,
            seasonId: apiResponse.matched?.seasonId || undefined,
            playerId: apiResponse.matched?.playerId || undefined,
            hasPlayerPrint: apiResponse.vision?.hasPlayerPrint ?? undefined,
            confidence: confidenceDetails.overall || 0,
            confidenceDetails,
            suggestions: apiResponse.suggestions,
            missingFields: apiResponse.missingFields,
          };

          console.log('[Vision AI] Mapped results:', {
            playerName: results.playerName,
            club: results.club,
            season: results.season,
            clubId: results.clubId,
            seasonId: results.seasonId,
            playerId: results.playerId,
          });

          setAiResults(results);

          // Pre-fill form with AI results based on confidence
          // High confidence (>= 70%): Auto-fill and link metadata
          // Medium confidence (50-69%): Fill text fields but don't link metadata
          // Low confidence (< 50%): Only fill if user explicitly requested

          const shouldAutoFill = (confidence: number) => confidence >= CONFIDENCE_THRESHOLD;
          const shouldSuggest = (confidence: number) => confidence >= 50 && confidence < CONFIDENCE_THRESHOLD;

          // Club: Auto-fill if high confidence, suggest if medium
          if (results.clubId && shouldAutoFill(confidenceDetails.club)) {
            formSetValue("club", results.club || "");
            onMetadataChange(results.clubId, undefined, undefined);
          } else if (results.club && shouldSuggest(confidenceDetails.club)) {
            // Medium confidence: Fill text but don't link
            formSetValue("club", results.club);
            // Show toast with suggestion
            toast({
              title: "Club Detected",
              description: `Found "${results.club}" (${Math.round(confidenceDetails.club)}% confidence). Please verify and select from the dropdown.`,
              variant: "default",
            });
          } else if (results.club && confidenceDetails.club < 50) {
            // Low confidence: Only fill if text field is empty
            const currentValues = formGetValues();
            if (!currentValues.club?.trim()) {
              formSetValue("club", results.club);
              toast({
                title: "Possible Club Detected",
                description: `AI detected "${results.club}" with low confidence. Please verify.`,
                variant: "default",
              });
            }
          }

          // Season: Auto-fill if high confidence, suggest if medium
          if (results.seasonId && shouldAutoFill(confidenceDetails.season)) {
            formSetValue("season", results.season || "");
            onMetadataChange(undefined, results.seasonId, undefined);
          } else if (results.season && shouldSuggest(confidenceDetails.season)) {
            formSetValue("season", results.season);
            toast({
              title: "Season Detected",
              description: `Found "${results.season}" (${Math.round(confidenceDetails.season)}% confidence). Please verify and select from the dropdown.`,
              variant: "default",
            });
          } else if (results.season && confidenceDetails.season < 50) {
            const currentValues = formGetValues();
            if (!currentValues.season?.trim()) {
              formSetValue("season", results.season);
              toast({
                title: "Possible Season Detected",
                description: `AI detected "${results.season}" with low confidence. Please verify.`,
                variant: "default",
              });
            }
          }

          // Player: Auto-fill if high confidence
          if (results.playerId && shouldAutoFill(confidenceDetails.player)) {
            formSetValue("playerName", results.playerName || "");
            formSetValue("playerNumber", results.playerNumber || "");
            onMetadataChange(undefined, undefined, results.playerId);
          } else if (results.playerName && shouldSuggest(confidenceDetails.player)) {
            formSetValue("playerName", results.playerName);
            if (results.playerNumber) {
              formSetValue("playerNumber", results.playerNumber);
            }
            toast({
              title: "Player Detected",
              description: `Found "${results.playerName}" (${Math.round(confidenceDetails.player)}% confidence). Please verify and select from the dropdown.`,
              variant: "default",
            });
          } else if (results.playerName && confidenceDetails.player < 50) {
            const currentValues = formGetValues();
            if (!currentValues.playerName?.trim()) {
              formSetValue("playerName", results.playerName);
              if (results.playerNumber) {
                formSetValue("playerNumber", results.playerNumber);
              }
              toast({
                title: "Possible Player Detected",
                description: `AI detected "${results.playerName}" with low confidence. Please verify.`,
                variant: "default",
              });
            }
          }

          // Jersey Type: Always fill if detected (no confidence threshold needed)
          // Map Vision API kit types to frontend jersey types
          if (results.jerseyType) {
            const mappedJerseyType = mapKitTypeToJerseyType(results.jerseyType);
            if (mappedJerseyType) {
              formSetValue("jerseyType", mappedJerseyType as any);
            }
          }

          // If AI succeeded with high overall confidence, skip steps 2 and 3
          if (results.confidence && results.confidence > CONFIDENCE_THRESHOLD) {
            setAiSkippedSteps(true);
          }
        } else {
          // AI failed - continue with manual input
          const errorText = await response.text().catch(() => "Unknown error");
          console.error("[Vision AI] Analysis failed:", {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          toast({
            title: "AI Analysis Unavailable",
            description: "Please fill in the information manually",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("[Vision AI] Vision analysis failed:", error);
        toast({
          title: "AI Analysis Error",
          description: error instanceof Error ? error.message : "Failed to analyze images",
          variant: "destructive",
        });
        // Continue with manual input - don't block user
      } finally {
        setIsAnalyzing(false);
      }
    },
    [getToken]
  );

  const reset = useCallback(() => {
    setEnableAI(false);
    setAiResults(null);
    setIsAnalyzing(false);
    setAiSkippedSteps(false);
  }, []);

  return {
    enableAI,
    aiResults,
    isAnalyzing,
    aiSkippedSteps,
    setEnableAI,
    analyzeImages,
    reset,
  };
}

