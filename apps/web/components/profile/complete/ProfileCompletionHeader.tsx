import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileCompletionHeaderProps {
  onClose: () => void;
}

export function ProfileCompletionHeader({
  onClose,
}: ProfileCompletionHeaderProps) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in your details to start buying and selling
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
