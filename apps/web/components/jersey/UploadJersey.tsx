'use client'

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { useUpdateJersey } from "@/lib/hooks/use-jerseys";
import { jerseyCreateSchemaWithoutImages, type JerseyCreateInput } from "@/lib/validation/jersey-schemas";
import { useUser, useAuth } from "@clerk/nextjs";
import { ImageUploadStep } from "./upload-steps/ImageUploadStep";
import { JerseyInfoStep } from "./upload-steps/JerseyInfoStep";
import { PlayerPrintStep } from "./upload-steps/PlayerPrintStep";
import { ConditionNotesStep } from "./upload-steps/ConditionNotesStep";
import { MissingDataStep } from "./upload-steps/MissingDataStep";
import { useDraftJersey } from "@/hooks/use-draft-jersey";
import { useJerseyImageUpload, type ImageFile } from "@/hooks/use-jersey-image-upload";
import { useJerseyVisionAI } from "@/hooks/use-jersey-vision-ai";
import { useJerseyUploadSteps } from "@/hooks/use-jersey-upload-steps";
import { UploadJerseyHeader } from "./upload/UploadJerseyHeader";
import { UploadJerseyProgress } from "./upload/UploadJerseyProgress";
import { UploadJerseyFooter } from "./upload/UploadJerseyFooter";
import { AIVisionResultsDisplay } from "./upload/AIVisionResults";
import { JerseyAnalysisLoading } from "./upload/JerseyAnalysisLoading";
import { motion, AnimatePresence } from "framer-motion";

interface UploadJerseyProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UploadJersey = ({ isOpen, onClose, onSuccess }: UploadJerseyProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const updateJersey = useUpdateJersey();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom hooks for separated concerns
  const draftJersey = useDraftJersey();
  const imageUpload = useJerseyImageUpload();
  const visionAI = useJerseyVisionAI();
  
  // Metadata FK state
  const [clubId, setClubId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [seasonId, setSeasonId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Wrapper functions for metadata state
  const handleMetadataChange = useCallback(
    (newClubId?: string, newSeasonId?: string, newPlayerId?: string) => {
      if (newClubId !== undefined) setClubId(newClubId);
      if (newSeasonId !== undefined) setSeasonId(newSeasonId);
      if (newPlayerId !== undefined) setPlayerId(newPlayerId);
    },
    []
  );

  const handleClubIdChange = useCallback((newClubId: string | undefined) => {
    setClubId(newClubId || "");
  }, []);

  const handleSeasonIdChange = useCallback((newSeasonId: string | undefined) => {
    setSeasonId(newSeasonId || "");
  }, []);

  const handlePlayerIdChange = useCallback((newPlayerId: string | undefined) => {
    setPlayerId(newPlayerId || "");
  }, []);

  // React Hook Form setup
  const form = useForm<Omit<JerseyCreateInput, "images">>({
    resolver: zodResolver(jerseyCreateSchemaWithoutImages),
    defaultValues: {
      club: "",
      season: "",
      jerseyType: "Home",
      playerName: undefined,
      playerNumber: undefined,
      badges: undefined,
      conditionRating: 8,
      notes: undefined,
      visibility: "public",
    },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  // Step navigation hook
  const steps = useJerseyUploadSteps({
    imagesCount: imageUpload.images.length,
    isAnalyzing: visionAI.isAnalyzing,
    aiSkippedSteps: visionAI.aiSkippedSteps,
    enableAI: visionAI.enableAI,
    hasMissingFields: !!(visionAI.aiResults?.missingFields && visionAI.aiResults.missingFields.length > 0),
    hasPlayerPrint: visionAI.aiResults?.hasPlayerPrint,
    formWatch: form.watch,
    formGetValues: form.getValues,
  });

  // Wrapper for goNext that triggers AI analysis if needed
  const handleGoNext = useCallback(async () => {
    // On step 1, if AI is enabled but not yet analyzed, trigger analysis first
    if (steps.step === 1 && visionAI.enableAI && !visionAI.isAnalyzing && !visionAI.aiResults) {
      const jerseyId = draftJersey.draftJerseyId;
      if (jerseyId && user) {
        // Use uploadedImageUrls if available, otherwise Edge Function will fetch from DB
        const imageUrls = imageUpload.uploadedImageUrls.length > 0 
          ? imageUpload.uploadedImageUrls 
          : []; // Empty array - Edge Function will fetch from database
        
        console.log("[UploadJersey] Triggering AI analysis on Next click", {
          jerseyId,
          userId: user.id,
          imageCount: imageUrls.length,
          willFetchFromDB: imageUrls.length === 0,
        });
        
        try {
          await visionAI.analyzeImages(
            jerseyId,
            user.id,
            imageUrls, // Can be empty - Edge Function will fetch from DB
            form.setValue,
            form.getValues,
            handleMetadataChange
          );
          // Don't proceed immediately - let user see results or wait for completion
          return;
        } catch (error) {
          console.error("[UploadJersey] Failed to trigger AI analysis:", error);
          // Continue to next step even if AI fails
        }
      } else {
        console.warn("[UploadJersey] Cannot trigger AI analysis:", {
          hasJerseyId: !!jerseyId,
          hasUser: !!user,
        });
      }
    }
    
    // Proceed with normal navigation
    steps.goNext();
  }, [steps, visionAI, draftJersey.draftJerseyId, user, imageUpload.uploadedImageUrls, form.setValue, handleMetadataChange]);

  // Auto-advance to step 4 if AI skipped steps
  useEffect(() => {
    if (steps.step === 1 && visionAI.aiSkippedSteps && !visionAI.isAnalyzing) {
      steps.goToStep(4);
    }
  }, [steps.step, visionAI.aiSkippedSteps, visionAI.isAnalyzing, steps]);

  // Create draft jersey when modal opens
  useEffect(() => {
    if (isOpen && !draftJersey.isDraftCreated && user) {
      draftJersey.createDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftJersey.isDraftCreated, user?.id]); // Use user?.id for stable reference

  // Cleanup draft when modal closes without submit
  useEffect(() => {
    if (!isOpen && draftJersey.draftJerseyId && !draftJersey.isSubmitted) {
      draftJersey.cleanupDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftJersey.draftJerseyId, draftJersey.isSubmitted]); // draftJersey methods are stable

  // Reset all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      steps.reset();
      imageUpload.reset();
      visionAI.reset();
      draftJersey.reset();
      setIsSubmitting(false);
      setClubId("");
      setPlayerId("");
      setSeasonId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen to avoid infinite loops

  // Image handling
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Check authentication first
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to upload a jersey.",
          variant: "destructive",
        });
        return;
      }

      // Hent nyt token i starten af upload-processen
      // Dette sikrer at vi har et frisk token gennem hele processen
      const freshToken = await getToken({ skipCache: true });
      if (!freshToken) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
        return;
      }

      // Ensure draft exists before uploading
      let jerseyId = draftJersey.draftJerseyId;
      if (!jerseyId) {
        jerseyId = await draftJersey.createDraft();
        if (!jerseyId) {
          // Error toast is already shown in createDraft
          return;
        }
      }

      if (!jerseyId) {
        toast({
          title: "Error",
          description: "Failed to initialize upload. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Add images to state and get the new images
      const newImages = await imageUpload.addImages(files);
      if (newImages.length === 0) return;

      try {
        // Upload the new images directly and get the uploaded URLs
        const uploadedUrls = await imageUpload.uploadToDraft(jerseyId, user.id, newImages);

        // Trigger AI Vision analysis if enabled (after all images uploaded)
        if (visionAI.enableAI && uploadedUrls.length > 0) {
          // Combine previously uploaded URLs with newly uploaded URLs
          // Note: imageUpload.uploadedImageUrls may not be updated yet, so we combine manually
          const existingUrls = imageUpload.uploadedImageUrls;
          const allUploadedUrls = [...existingUrls, ...uploadedUrls];
          // Remove duplicates (shouldn't happen, but just in case)
          const uniqueUrls = Array.from(new Set(allUploadedUrls));
          await visionAI.analyzeImages(
            jerseyId,
            user.id,
            uniqueUrls,
            form.setValue,
            form.getValues,
            handleMetadataChange
          );
        }
      } catch (error) {
        // Error already handled in hook
        console.error("Error uploading images:", error);
      }
    },
    [draftJersey, user, imageUpload, visionAI, form.setValue, handleMetadataChange, toast, getToken]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
    e.preventDefault();
      if (imageUpload.draggedIndex === null || imageUpload.draggedIndex === index) return;
      imageUpload.reorderImages(imageUpload.draggedIndex, index);
      imageUpload.setDraggedIndex(index);
    },
    [imageUpload]
  );

  // Submit handler - updates draft jersey instead of creating new
  const handleSubmit = useCallback(async () => {
    if (imageUpload.images.length < 1) {
      toast({
        title: "No Images",
        description: "Please upload at least 1 image",
        variant: "destructive",
      });
      return;
    }

    if (imageUpload.images.length > 5) {
      toast({
        title: "Too Many Images",
        description: "Maximum 5 images allowed",
        variant: "destructive",
      });
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      const errors = form.formState.errors;
      const firstErrorKey = Object.keys(errors)[0];
      const firstError = errors[firstErrorKey as keyof typeof errors];
      toast({
        title: "Validation Error",
        description: firstError?.message || "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!user || !draftJersey.draftJerseyId) {
        toast({
        title: "Error",
        description: "Draft jersey not found. Please try again.",
          variant: "destructive",
        });
        return;
      }

    setIsSubmitting(true);
    draftJersey.markSubmitted();

    try {
      const formValues = form.getValues();

      // Hent også nyt token før final submit (ekstra sikkerhed)
      // Selvom vi allerede har hentet et token i handleFileSelect,
      // kan processen have taget så lang tid at tokenet er udløbet igen
      const freshToken = await getToken({ skipCache: true });
      if (!freshToken) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Update draft jersey to published status with all form data
      // Images are already in jersey_images table via Edge Function upload
      await updateJersey.mutateAsync({
        id: draftJersey.draftJerseyId,
        data: {
        ...formValues,
        badges: formValues.badges && formValues.badges.length > 0 ? formValues.badges : undefined,
        clubId: clubId || undefined,
        seasonId: seasonId || undefined,
        playerId: playerId || undefined,
          status: "published",
        },
      });

      toast({
        title: "Jersey Uploaded!",
        description: "Your jersey has been added to your collection",
      });

      onSuccess?.();
      onClose();
    } catch (error) {
        console.error("Error uploading jersey:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload jersey. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    imageUpload.images.length,
    form,
    user,
    draftJersey,
    updateJersey,
    clubId,
    seasonId,
    playerId,
    onSuccess,
    onClose,
    getToken,
  ]);

  // Early return AFTER all hooks are called
  if (!isOpen) return null;

  const renderStep = () => {
    // If analyzing with AI, show loading state
    if (visionAI.isAnalyzing) {
      return <JerseyAnalysisLoading />;
    }

    const stepContent = (() => {
      switch (steps.step) {
        case 1:
          return (
            <div className="space-y-4">
              <ImageUploadStep
                images={imageUpload.images}
                fileInputRef={fileInputRef}
                onFileSelect={handleFileSelect}
                onRemoveImage={imageUpload.removeImage}
                onDragStart={imageUpload.setDraggedIndex}
                onDragOver={handleDragOver}
                onDragEnd={() => imageUpload.setDraggedIndex(null)}
              />
              <AIVisionResultsDisplay
                results={visionAI.aiResults}
                isAnalyzing={visionAI.isAnalyzing}
              />
            </div>
          );
        case 2:
          // Show MissingDataStep if AI found missing fields, otherwise show JerseyInfoStep
          const hasMissingFields = !!(visionAI.aiResults?.missingFields && visionAI.aiResults.missingFields.length > 0);
          if (hasMissingFields) {
            return (
              <MissingDataStep
                missingFields={visionAI.aiResults.missingFields || []}
                clubId={clubId}
                seasonId={seasonId}
                playerId={playerId}
                onClubIdChange={handleClubIdChange}
                onSeasonIdChange={handleSeasonIdChange}
                onPlayerIdChange={handlePlayerIdChange}
                suggestions={visionAI.aiResults?.suggestions}
              />
            );
          }
          return (
            <JerseyInfoStep
              clubId={clubId}
              seasonId={seasonId}
              onClubIdChange={handleClubIdChange}
              onSeasonIdChange={handleSeasonIdChange}
            />
          );
        case 3:
          // Only show PlayerPrintStep if hasPlayerPrint is not false
          // If hasPlayerPrint is false, skip this step
          if (visionAI.aiResults?.hasPlayerPrint === false) {
            // Skip player step - go directly to condition notes
            return <ConditionNotesStep clubId={clubId} seasonId={seasonId} isAI={visionAI.aiSkippedSteps} />;
          }
          return (
            <PlayerPrintStep
              clubId={clubId}
              seasonId={seasonId}
              playerId={playerId}
              onPlayerIdChange={handlePlayerIdChange}
              onClubIdChange={handleClubIdChange}
              onSeasonIdChange={handleSeasonIdChange}
            />
          );
        case 4:
          return <ConditionNotesStep clubId={clubId} seasonId={seasonId} isAI={visionAI.aiSkippedSteps} />;
        default:
          return null;
      }
    })();

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={steps.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {stepContent}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <FormProvider {...form}>
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
          <UploadJerseyHeader
            currentStep={steps.currentStepNumber}
            totalSteps={steps.totalSteps}
            aiSkippedSteps={visionAI.aiSkippedSteps}
            isSubmitting={isSubmitting}
            onClose={onClose}
            stepTitle={
              visionAI.isAnalyzing ? "AI Analysis" :
              steps.step === 2 ? (visionAI.aiResults?.missingFields && visionAI.aiResults.missingFields.length > 0) ? "Udfyld manglende oplysninger" : "Jersey Details" :
              steps.step === 3 ? "Player Details" :
              steps.step === 4 ? "Summary" :
              undefined
            }
          />

          {!visionAI.isAnalyzing && (
            <UploadJerseyProgress
              currentStep={steps.currentStepNumber}
              totalSteps={steps.totalSteps}
              uploadProgress={100}
              isSubmitting={isSubmitting}
            />
          )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">{renderStep()}</div>
        </div>

          {!visionAI.isAnalyzing && (
            <UploadJerseyFooter
              step={steps.step}
              totalSteps={steps.totalSteps}
              aiSkippedSteps={visionAI.aiSkippedSteps}
              canProceed={steps.canProceed}
              isSubmitting={isSubmitting}
              isAnalyzing={visionAI.isAnalyzing}
              enableAI={visionAI.enableAI}
              onEnableAIChange={visionAI.setEnableAI}
              visibility={form.watch("visibility") as "public" | "private"}
              onVisibilityChange={(visibility) => form.setValue("visibility", visibility)}
              onBack={steps.goBack}
              onNext={handleGoNext}
              onSubmit={handleSubmit}
              onClose={onClose}
            />
          )}
      </div>
    </div>
    </FormProvider>
  );
};
