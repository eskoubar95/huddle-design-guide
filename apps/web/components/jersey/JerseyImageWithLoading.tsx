'use client'

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface JerseyImageWithLoadingProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Lightweight image component with a loading skeleton and graceful fallback.
 * Shows a pulse overlay until the image has loaded and swaps to fallbackSrc on error.
 */
export function JerseyImageWithLoading({
  src,
  fallbackSrc,
  alt,
  className,
  containerClassName,
  onLoad,
  onError,
}: JerseyImageWithLoadingProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
  }, [src]);

  return (
    <div className={cn("relative w-full h-full bg-secondary", containerClassName)}>
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/50">
          <div className="absolute inset-4 rounded-lg border border-border/40" />
        </div>
      )}

      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
            setIsLoaded(false);
          }
          onError?.();
        }}
      />
    </div>
  );
}








