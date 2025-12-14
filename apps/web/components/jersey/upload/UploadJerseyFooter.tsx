import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";

interface UploadJerseyFooterProps {
  step: number;
  totalSteps: number;
  aiSkippedSteps: boolean;
  canProceed: boolean;
  isSubmitting: boolean;
  isAnalyzing?: boolean;
  enableAI?: boolean;
  onEnableAIChange?: (enabled: boolean) => void;
  visibility?: "public" | "private";
  onVisibilityChange?: (visibility: "public" | "private") => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function UploadJerseyFooter({
  step,
  // Removed unused: totalSteps, aiSkippedSteps
  canProceed,
  isSubmitting,
  isAnalyzing,
  enableAI,
  onEnableAIChange,
  visibility,
  onVisibilityChange,
  onBack,
  onNext,
  onSubmit,
  onClose,
}: UploadJerseyFooterProps) {
  const handleBack = () => {
    if (step === 1) {
      onClose();
    } else {
      onBack();
    }
  };

  const handleAction = () => {
    if (step === 4) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <footer className="border-t border-border bg-card p-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
        <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        

        <div className="flex items-center gap-2">
            {/* AI Toggle - only show on step 1 */}
            {step === 1 && onEnableAIChange && (
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <Label htmlFor="ai-toggle-footer" className="text-sm cursor-pointer">
                AI Vision
                </Label>
                <Switch
                id="ai-toggle-footer"
                checked={enableAI ?? false}
                onCheckedChange={onEnableAIChange}
                aria-label="Enable AI Vision"
                />
            </div>
            )}

            {/* Visibility Toggle - only show on step 4 */}
            {step === 4 && onVisibilityChange && visibility !== undefined && (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Private</span>
                <Switch
                id="visibility-toggle-footer"
                checked={visibility === "public"}
                onCheckedChange={(checked) =>
                  onVisibilityChange(checked ? "public" : "private")
                }
                aria-label="Visibility"
                />
                <span className="text-sm font-medium">Public</span>
            </div>
            )}

            <Button 
              onClick={handleAction} 
              disabled={isSubmitting || !canProceed || (step === 1 && isAnalyzing)}
            >
              {step === 4 
                ? (isSubmitting ? "Uploading..." : "Upload Jersey") 
                : step === 1 && isAnalyzing
                ? "Analyzing..."
                : "Next"}
            </Button>
        </div>
        
      </div>
    </footer>
  );
}

