import { useState, useCallback, useMemo } from "react";
import { UseFormWatch, UseFormGetValues } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";

type Step = "personal-info" | "shipping-address" | "summary";

interface UseProfileCompletionStepsParams {
  formWatch: UseFormWatch<ProfileCompletionInput>;
  formGetValues: UseFormGetValues<ProfileCompletionInput>;
}

interface UseProfileCompletionStepsReturn {
  currentStep: Step;
  stepNumber: number;
  totalSteps: number;
  canProceed: boolean;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: Step) => void;
  reset: () => void;
}

const STEPS: Step[] = ["personal-info", "shipping-address", "summary"];

export function useProfileCompletionSteps({
  formWatch,
  formGetValues,
}: UseProfileCompletionStepsParams): UseProfileCompletionStepsReturn {
  const [currentStep, setCurrentStep] = useState<Step>("personal-info");

  const stepNumber = useMemo(
    () => STEPS.indexOf(currentStep) + 1,
    [currentStep]
  );

  const totalSteps = STEPS.length;

  // Watch form fields
  const firstName = formWatch("firstName");
  const lastName = formWatch("lastName");
  const phone = formWatch("phone");
  const fullName = formWatch("shippingAddress.fullName");
  const street = formWatch("shippingAddress.street");
  const city = formWatch("shippingAddress.city");
  const postalCode = formWatch("shippingAddress.postalCode");
  const country = formWatch("shippingAddress.country");
  const shippingPhone = formWatch("shippingAddress.phone");

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case "personal-info":
        return !!(
          firstName?.trim() &&
          lastName?.trim() &&
          phone?.trim()
        );
      case "shipping-address":
        return !!(
          fullName?.trim() &&
          street?.trim() &&
          city?.trim() &&
          postalCode?.trim() &&
          country?.trim() &&
          shippingPhone?.trim()
        );
      case "summary":
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    firstName,
    lastName,
    phone,
    fullName,
    street,
    city,
    postalCode,
    country,
    shippingPhone,
  ]);

  const goNext = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);

    // Validate current step before proceeding
    if (currentStep === "personal-info") {
      const values = formGetValues();
      if (
        !values.firstName?.trim() ||
        !values.lastName?.trim() ||
        !values.phone?.trim()
      ) {
        toast({
          title: "Required Fields",
          description: "Please fill in all personal information fields",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === "shipping-address") {
      const values = formGetValues();
      if (
        !values.shippingAddress.fullName?.trim() ||
        !values.shippingAddress.street?.trim() ||
        !values.shippingAddress.city?.trim() ||
        !values.shippingAddress.postalCode?.trim() ||
        !values.shippingAddress.country?.trim() ||
        !values.shippingAddress.phone?.trim()
      ) {
        toast({
          title: "Required Fields",
          description: "Please fill in all shipping address fields",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  }, [currentStep, formGetValues]);

  const goBack = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  const reset = useCallback(() => {
    setCurrentStep("personal-info");
  }, []);

  return {
    currentStep,
    stepNumber,
    totalSteps,
    canProceed,
    goNext,
    goBack,
    goToStep,
    reset,
  };
}
