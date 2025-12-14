import { useState, useCallback, useMemo } from "react";
import { UseFormWatch, UseFormGetValues } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import type { JerseyCreateInput } from "@/lib/validation/jersey-schemas";

interface UseJerseyUploadStepsParams {
  imagesCount: number;
  isAnalyzing: boolean;
  aiSkippedSteps: boolean;
  enableAI: boolean;
  hasMissingFields: boolean; // Whether AI found missing fields that need manual input
  hasPlayerPrint?: boolean; // Whether the jersey has player print on the back
  formWatch: UseFormWatch<Omit<JerseyCreateInput, "images">>;
  formGetValues: UseFormGetValues<Omit<JerseyCreateInput, "images">>;
}

interface UseJerseyUploadStepsReturn {
  step: number;
  totalSteps: number;
  currentStepNumber: number;
  canProceed: boolean;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

export function useJerseyUploadSteps({
  imagesCount,
  isAnalyzing,
  aiSkippedSteps,
  enableAI,
  hasMissingFields,
  hasPlayerPrint,
  formWatch,
  formGetValues,
}: UseJerseyUploadStepsParams): UseJerseyUploadStepsReturn {
  const [step, setStep] = useState(1);

  // Step calculation:
  // - Step 1: Image Upload
  // - Step 2: Jersey Info (Club, Season, Type) OR Missing Data (if hasMissingFields)
  // - Step 3: Player Print (only if hasPlayerPrint is true)
  // - Step 4: Condition Notes
  const totalSteps = useMemo(() => {
    if (aiSkippedSteps && !hasMissingFields) {
      // AI succeeded completely - skip to Condition Notes
      return 2;
    }
    // Count steps: 1 (upload) + 1 (info/missing) + (player if has print) + 1 (condition)
    let steps = 3; // Upload + Info/Missing + Condition
    if (hasPlayerPrint !== false) {
      // If hasPlayerPrint is true or undefined, include player step
      steps += 1;
    }
    return steps;
  }, [aiSkippedSteps, hasMissingFields, hasPlayerPrint]);

  const currentStepNumber = useMemo(() => {
    if (aiSkippedSteps && !hasMissingFields) {
      // Show step 2 when on condition notes if AI skipped
      return step === 4 ? 2 : step;
    }
    return step;
  }, [aiSkippedSteps, hasMissingFields, step]);

  const club = formWatch("club");
  const season = formWatch("season");
  const jerseyType = formWatch("jerseyType");

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        // On step 1, can proceed if images uploaded and not analyzing
        // If AI is enabled, wait for analysis to complete
        return imagesCount >= 1 && !isAnalyzing;
      case 2:
        // Step 2: Either Jersey Info OR Missing Data
        if (hasMissingFields) {
          // Missing Data step - check required fields based on what's missing
          // This will be validated in the component itself
          return true; // Component handles validation
        } else {
          // Normal Jersey Info step
          return !!(club?.trim() && season?.trim() && jerseyType);
        }
      case 3:
        // Step 3: Player Print (only shown if hasPlayerPrint !== false)
        // This is optional, so always true
        return true;
      case 4:
        // Step 4: Condition Notes (optional)
        return true;
      default:
        return false;
    }
  }, [step, imagesCount, isAnalyzing, club, season, jerseyType, hasMissingFields]);

  const goNext = useCallback(() => {
    // On step 1, if AI is enabled and still analyzing, don't proceed
    if (step === 1 && enableAI && isAnalyzing) {
      toast({
        title: "AI Analysis in Progress",
        description: "Please wait for AI analysis to complete",
        variant: "default",
      });
      return;
    }

    if (step === 1 && aiSkippedSteps && !hasMissingFields) {
      // Skip directly to step 4 (Condition Notes) if AI succeeded completely
      setStep(4);
      return;
    }

    if (step === 2 && !hasMissingFields) {
      // Only validate if it's the normal Jersey Info step (not Missing Data step)
      const values = formGetValues();
      if (!values.club?.trim() || !values.season?.trim() || !values.jerseyType) {
        toast({
          title: "Required Fields",
          description: "Please fill in club, season, and jersey type",
          variant: "destructive",
        });
        return;
      }
    }

    // Skip step 3 (Player Print) if hasPlayerPrint is false
    if (step === 2 && hasPlayerPrint === false) {
      setStep(4); // Skip to Condition Notes
      return;
    }

    setStep((prev) => prev + 1);
  }, [step, aiSkippedSteps, enableAI, isAnalyzing, hasMissingFields, hasPlayerPrint, formGetValues]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  }, [step]);

  const goToStep = useCallback((newStep: number) => {
    setStep(newStep);
  }, []);

  const reset = useCallback(() => {
    setStep(1);
  }, []);

  return {
    step,
    totalSteps,
    currentStepNumber,
    canProceed,
    goNext,
    goBack,
    goToStep,
    reset,
  };
}

