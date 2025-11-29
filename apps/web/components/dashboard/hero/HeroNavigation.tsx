'use client'

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroNavigationProps {
  slidesCount: number;
  currentSlide: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
}

export const HeroNavigation = ({ 
  slidesCount, 
  currentSlide, 
  onPrev, 
  onNext, 
  onGoTo 
}: HeroNavigationProps) => {
  if (slidesCount <= 1) return null;

  return (
    <div className="flex items-center gap-4 mt-8">
      {/* Arrows */}
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          className="w-8 h-8 md:w-8 md:h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10 group"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-white group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={onNext}
          className="w-8 h-8 md:w-8 md:h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10 group"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex gap-2 ml-2">
        {Array.from({ length: slidesCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => onGoTo(index)}
            className={cn(
              "h-1.5 md:h-2 rounded-full transition-all duration-300",
              index === currentSlide
                ? "w-1.5 md:w-2 bg-white shadow-glow scale-125"
                : "w-1.5 md:w-2 bg-white/20 hover:bg-white/40"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
