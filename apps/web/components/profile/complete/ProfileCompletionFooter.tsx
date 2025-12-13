import { Button } from "@/components/ui/button";

interface ProfileCompletionFooterProps {
  stepNumber: number;
  totalSteps: number;
  canProceed: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ProfileCompletionFooter({
  stepNumber,
  totalSteps,
  canProceed,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
  onClose,
}: ProfileCompletionFooterProps) {
  const handleBack = () => {
    if (stepNumber === 1) {
      onClose();
    } else {
      onBack();
    }
  };

  const handleAction = () => {
    if (stepNumber === totalSteps) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <footer className="border-t border-border bg-card p-4 sticky bottom-0">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
        <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
          {stepNumber === 1 ? "Cancel" : "Back"}
        </Button>

        <Button onClick={handleAction} disabled={isSubmitting || !canProceed}>
          {stepNumber === totalSteps
            ? isSubmitting
              ? "Submitting..."
              : "Complete Profile"
            : "Next"}
        </Button>
      </div>
    </footer>
  );
}
