import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadJerseyHeaderProps {
  currentStep: number;
  totalSteps: number;
  aiSkippedSteps: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  stepTitle?: string; // Optional step-specific title
}

export function UploadJerseyHeader({
  currentStep,
  totalSteps,
  aiSkippedSteps,
  isSubmitting,
  onClose,
  stepTitle,
}: UploadJerseyHeaderProps) {
  const title = stepTitle || "Upload Jersey";
  
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close upload dialog"
          >
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
              {aiSkippedSteps && " (AI detected metadata)"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

