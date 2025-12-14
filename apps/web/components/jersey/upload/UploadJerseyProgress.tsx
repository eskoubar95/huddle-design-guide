interface UploadJerseyProgressProps {
  currentStep: number;
  totalSteps: number;
  uploadProgress?: number;
  isSubmitting?: boolean;
}

export function UploadJerseyProgress({
  currentStep,
  totalSteps,
  uploadProgress,
  isSubmitting = false,
}: UploadJerseyProgressProps) {
  const stepProgress = (currentStep / totalSteps) * 100;

  return (
    <>
      {/* Step Progress Bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${stepProgress}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>

      {/* Upload Progress Bar */}
      {isSubmitting && uploadProgress !== undefined && uploadProgress > 0 && (
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </>
  );
}

