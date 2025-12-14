import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileCompletionHeaderProps {
  currentStep: number;
  totalSteps: number;
  onClose: () => void;
  stepTitle?: string;
}

export function ProfileCompletionHeader({
  currentStep,
  totalSteps,
  onClose,
  stepTitle,
}: ProfileCompletionHeaderProps) {
  const title = stepTitle || "Complete Profile";

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close profile completion"
          >
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
