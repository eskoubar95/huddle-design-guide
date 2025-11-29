'use client'

import Image from "next/image";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeroSlideProps {
  children: ReactNode;
  gradient?: string;
  backgroundImage?: string;
}

export const HeroSlide = ({ 
  children, 
  gradient,
  backgroundImage = "/Gemini_Generated_Image_ql6m56ql6m56ql6m.png"
}: HeroSlideProps) => {
  return (
    <div
      className={cn(
        // Container dimensions
        "relative overflow-hidden rounded-3xl border border-card",
        "w-full",
        
        // Height: Increased mobile height to 500px
        "h-[500px] 2xl:h-[600px]",
        
        // Remove default padding to let children control layout
        "p-0",
        
        // Flex layout
        "flex flex-col justify-center",
        
        // Max width constraint
        "mx-auto max-w-[1600px]",
        
        // Gradient background (optional)
        gradient
      )}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backgroundImage}
          alt="Hero background"
          fill
          className="object-cover opacity-50"
          priority
        />
        {/* Dark overlay removed as requested */}
        {/* <div className="absolute inset-0 bg-black/60" /> */}
      </div>

      {/* Content wrapper - full height/width */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
