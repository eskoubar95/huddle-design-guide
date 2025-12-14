'use client'

import { useEffect } from "react";
import { Loader2, CheckCircle2, Upload, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadSubmitProgressProps {
  currentStep: 'saving' | 'complete';
  onComplete?: () => void;
}

const steps = {
  saving: {
    icon: Save,
    title: "Saving your jersey...",
    description: "Almost done, just a moment",
    color: "text-primary",
  },
  complete: {
    icon: CheckCircle2,
    title: "Jersey uploaded!",
    description: "Redirecting to your wardrobe",
    color: "text-success",
  },
};

export function UploadSubmitProgress({ currentStep, onComplete }: UploadSubmitProgressProps) {
  const step = steps[currentStep];
  const Icon = step.icon;

  // Auto-trigger onComplete when step is complete
  useEffect(() => {
    if (currentStep === 'complete' && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1500); // Show success for 1.5 seconds before redirect
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl shadow-lg p-8 max-w-md w-full mx-4"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <motion.div
            animate={{ 
              rotate: currentStep === 'saving' ? 360 : 0,
              scale: currentStep === 'complete' ? [1, 1.2, 1] : 1,
            }}
            transition={{ 
              rotate: { duration: 2, repeat: currentStep === 'saving' ? Infinity : 0, ease: "linear" },
              scale: { duration: 0.3, times: [0, 0.5, 1] }
            }}
            className={`${step.color} mb-2`}
          >
            {currentStep === 'saving' ? (
              <Loader2 className="w-16 h-16 animate-spin" />
            ) : (
              <CheckCircle2 className="w-16 h-16" />
            )}
          </motion.div>
          
          <div>
            <h3 className="text-xl font-bold mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>

          {currentStep === 'saving' && (
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mt-4">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
