import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileCompletionHeaderProps {
  currentStep: number;
  totalSteps: number;
  onClose: () => void;
  onSkip?: () => void;
  stepTitle?: string;
}

export function ProfileCompletionHeader({
  currentStep,
  totalSteps,
  onClose,
  onSkip,
  stepTitle,
}: ProfileCompletionHeaderProps) {
  const title = stepTitle || "Complete Profile";

  const handleClose = () => {
    // If onSkip is provided, use it (skip functionality), otherwise use onClose
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          aria-label={onSkip ? "Skip profile completion" : "Close"}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
