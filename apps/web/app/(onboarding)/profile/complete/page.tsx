'use client'

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useProfileCompletionSteps } from "@/hooks/use-profile-completion-steps";
import { ProfileCompletionHeader } from "@/components/profile/complete/ProfileCompletionHeader";
import { ProfileCompletionProgress } from "@/components/profile/complete/ProfileCompletionProgress";
import { ProfileCompletionFooter } from "@/components/profile/complete/ProfileCompletionFooter";
import { PersonalInfoStep } from "@/components/profile/complete/steps/PersonalInfoStep";
import { ShippingAddressStep } from "@/components/profile/complete/steps/ShippingAddressStep";
import { SummaryStep } from "@/components/profile/complete/steps/SummaryStep";
import {
  profileCompletionSchema,
  type ProfileCompletionInput,
} from "@/lib/validation/profile-schemas";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const STEP_LABELS = ["Personal Info", "Shipping Address", "Review"];

export default function ProfileCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate redirect URL to prevent open redirects
  const redirectUrl = (() => {
    const param = searchParams?.get("redirect_url");
    // Only allow relative paths starting with / (not //)
    if (param && param.startsWith("/") && !param.startsWith("//")) {
      return param;
    }
    return "/profile";
  })();

  const handleSkip = () => {
    // Mark that user has seen onboarding
    localStorage.setItem("huddle_onboarding_seen", "true");
    toast.info("You can complete your profile anytime from Settings");
    router.push(redirectUrl);
  };

  const form = useForm<ProfileCompletionInput>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      shippingAddress: {
        fullName: "",
        street: "",
        city: "",
        postalCode: "",
        country: "",
        phone: "",
        isDefault: true,
      },
    },
    mode: "onBlur",
  });

  const {
    currentStep,
    stepNumber,
    totalSteps,
    canProceed,
    goNext,
    goBack,
    reset,
  } = useProfileCompletionSteps({
    formWatch: form.watch,
    formGetValues: form.getValues,
  });

  const handleClose = () => {
    reset();
    router.push("/profile");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const values = form.getValues();

      const response = await fetch("/api/v1/profile/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to complete profile");
      }

      toast({
        title: "Profile Completed",
        description: "Your profile has been successfully updated",
      });

      reset();
      router.push(redirectUrl);
    } catch (error) {
      console.error("Profile completion error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileCompletionHeader onClose={handleClose} />

      <ProfileCompletionProgress
        currentStep={stepNumber}
        totalSteps={totalSteps}
        stepLabels={STEP_LABELS}
      />

      <main className="flex-1 pb-20">
        {currentStep === "personal-info" && (
          <PersonalInfoStep
            register={form.register}
            control={form.control}
            errors={form.formState.errors}
          />
        )}

        {currentStep === "shipping-address" && (
          <ShippingAddressStep
            register={form.register}
            control={form.control}
            watch={form.watch}
            errors={form.formState.errors}
          />
        )}

        {currentStep === "summary" && (
          <SummaryStep getValues={form.getValues} />
        )}
      </main>

      <ProfileCompletionFooter
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        canProceed={canProceed}
        isSubmitting={isSubmitting}
        onBack={goBack}
        onNext={goNext}
        onSubmit={handleSubmit}
        onClose={handleClose}
        onSkip={handleSkip}
      />
    </div>
  );
}
