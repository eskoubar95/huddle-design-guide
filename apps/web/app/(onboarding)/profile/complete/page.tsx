'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import * as Sentry from "@sentry/nextjs";
import { useProfileCompletionSteps } from "@/hooks/use-profile-completion-steps";
import { useCountries } from "@/hooks/use-countries";
import { ProfileCompletionHeader } from "@/components/profile/complete/ProfileCompletionHeader";
import { ProfileCompletionFooter } from "@/components/profile/complete/ProfileCompletionFooter";
import { PersonalInfoStep } from "@/components/profile/complete/steps/PersonalInfoStep";
import { ShippingAddressStep } from "@/components/profile/complete/steps/ShippingAddressStep";
import { SummaryStep } from "@/components/profile/complete/steps/SummaryStep";
import {
  profileCompletionSchema,
  type ProfileCompletionInput,
} from "@/lib/validation/profile-schemas";

function ProfileCompletePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { getToken } = useAuth();
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
    toast({
      title: "Skipped for now",
      description: "You can complete your profile anytime from Settings",
    });
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
        addressLine2: "",
        city: "",
        postalCode: "",
        country: "",
        phone: "",
        isDefault: true,
      },
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
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

  // Preload countries early so they're ready when user reaches step 2
  const { data: countries = [] } = useCountries();

  // Sync personal info to shipping address when moving to step 2
  useEffect(() => {
    if (currentStep === "shipping-address") {
      const { firstName, lastName, phone, shippingAddress } = form.getValues();
      
      // Auto-fill full name if empty
      if (!shippingAddress.fullName && firstName && lastName) {
        form.setValue("shippingAddress.fullName", `${firstName} ${lastName}`.trim());
      }
      
      // Auto-fill phone if empty
      if (!shippingAddress.phone && phone) {
        form.setValue("shippingAddress.phone", phone);
      }
    }
  }, [currentStep, form]);

  const handleClose = () => {
    reset();
    router.push("/profile");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const values = form.getValues();
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const response = await fetch("/api/v1/profile/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
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
      Sentry.captureException(error, {
        tags: {
          page: "/profile/complete",
          operation: "submitProfileComplete",
        },
      });
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

  const getStepTitle = () => {
    switch (currentStep) {
      case "personal-info":
        return "Personal Information";
      case "shipping-address":
        return "Shipping Address";
      case "summary":
        return "Review Details";
      default:
        return "Complete Profile";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileCompletionHeader 
        currentStep={stepNumber}
        totalSteps={totalSteps}
        onClose={handleClose}
        onSkip={handleSkip}
        stepTitle={getStepTitle()}
      />

      <main className="flex-1 overflow-y-auto">
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
            countries={countries}
            setValue={form.setValue}
          />
        )}

        {currentStep === "summary" && (
          <SummaryStep getValues={form.getValues} countries={countries} />
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
      />
    </div>
  );
}

export default function ProfileCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ProfileCompletePageContent />
    </Suspense>
  );
}
