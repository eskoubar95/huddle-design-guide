'use client'

import { useRouter } from "next/navigation";
import { ShoppingBag, Tag, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSlideData } from "@/lib/hooks/use-hero-slides";
import { HeroNavigation } from "../HeroNavigation";
import { JerseyImageWithLoading } from "@/components/jersey/JerseyImageWithLoading";
import { cn } from "@/lib/utils";

interface SaleSlideProps {
  slide?: HeroSlideData;
  slidesCount?: number;
  currentSlide?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onGoTo?: (index: number) => void;
}

export const SaleSlide = ({ 
  slide, 
  slidesCount = 0, 
  currentSlide = 0,
  onPrev = () => {},
  onNext = () => {},
  onGoTo = () => {}
}: SaleSlideProps) => {
  const router = useRouter();
  
  // Type-safe jersey data
  interface JerseyData {
    id: string;
    club: string;
    season: string;
    jersey_type: string;
    condition?: number;
    images?: string[];
    listing: {
      id: string;
      currency: string;
      price: number;
      status: string;
      type: string;
    };
  }
  
  const jersey = slide?.data as JerseyData | undefined;

  if (!jersey || !jersey.listing) {
    return null; 
  }

  // Green theme for "Sale/Success"
  const styles = {
    borderColor: 'border-success/50',
    gradientBorder: 'from-success via-success/50 to-transparent',
    iconColor: 'text-success',
    badgeBg: 'bg-success/10 border-success/20',
    icon: ShoppingBag
  };

  const TierIcon = styles.icon;

  return (
    <div className="relative h-full w-full flex items-center justify-between p-4 md:p-8 lg:p-8 2xl:p-12">
      {/* Left Content */}
      <div className="flex flex-col justify-between h-full z-10 max-w-lg w-full md:w-1/2 lg:w-auto">
        {/* Top Left - Title */}
        <div>
          <h2 className="text-lg md:text-xl lg:text-2xl font-mono text-white font-bold tracking-widest uppercase mb-1">
             Featured Sale
          </h2>
          <h2 className="text-3xl md:text-4xl lg:text-4xl 2xl:text-6xl font-black text-white uppercase tracking-tight leading-none">
            {jersey.club}
          </h2>
        </div>

        {/* Central Left - Glass Card Details */}
        <div className="w-full max-w-[280px] lg:max-w-[300px] my-auto">
          <div className="rounded-2xl bg-background/20 backdrop-blur-md border border-white/10 p-4 space-y-3 shadow-xl">
             
             {/* Price - Highlighted */}
             <div className="flex items-center justify-between border-b border-white/10 pb-2">
               <div className="flex items-center gap-3">
                 <div className="p-1.5 rounded-lg bg-white/10">
                   <Star className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-sm font-medium text-white/80">Price</span>
               </div>
               {/* New Price Style: Mono, Medium, White */}
               <p className="text-lg font-mono font-medium text-white">
                 {jersey.listing.currency} {jersey.listing.price.toLocaleString()}
               </p>
             </div>
             
             {/* Type */}
             <div className="flex items-center justify-between border-b border-white/10 pb-2">
               <div className="flex items-center gap-3">
                 <div className="p-1.5 rounded-lg bg-white/10">
                   <Tag className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-sm font-medium text-white/80">Type</span>
               </div>
               <span className="text-base lg:text-lg font-bold text-white">{jersey.jersey_type}</span>
             </div>

             {/* Season */}
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-1.5 rounded-lg bg-white/10">
                   <Calendar className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-sm font-medium text-white/80">Season</span>
               </div>
               <span className="text-base lg:text-lg font-bold text-white">{jersey.season}</span>
             </div>
          </div>
        </div>

        {/* Bottom Left - CTA */}
        <div>
        <div className="mb-4">
          {/* Navigation directly under the card */}
            <HeroNavigation 
              slidesCount={slidesCount} 
              currentSlide={currentSlide}
              onPrev={onPrev}
              onNext={onNext}
              onGoTo={onGoTo}
            />
        </div>
          <Button
            onClick={() => router.push(`/checkout/sale/${jersey.listing.id}`)}
            variant="default" 
            className="font-semibold bg-white text-black hover:bg-white/90 border-none shadow-lg w-full md:w-auto"
          >
            Buy Now
          </Button>
        </div>
      </div>

      {/* Right Side - Collector Card */}
      <div className="hidden md:flex h-full w-1/2 items-center justify-center z-10 pl-4 lg:pl-0">
        <div className="relative w-full max-w-[260px] lg:max-w-[320px] aspect-[3/4]">
          {/* Gradient Border Wrapper */}
          <div 
            className={cn(
              "absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-b",
              styles.gradientBorder
            )}
            style={{
              // Clip top-right corner for "Notch" effect
              clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)"
            }}
          >
            {/* Inner Card Content */}
            <div 
              className="relative w-full h-full bg-card rounded-[14px] overflow-hidden"
              style={{
                clipPath: "polygon(0 0, calc(100% - 19px) 0, 100% 19px, 100% 100%, 0 100%)"
              }}
            >
              {/* Full Size Image */}
              {jersey.images && jersey.images.length > 0 ? (
                <JerseyImageWithLoading
                  src={jersey.images[0]}
                  alt={`${jersey.club} ${jersey.season}`}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">No image</span>
                </div>
              )}

              {/* Top Left Sale Icon */}
              <div className="absolute top-4 left-4 z-20">
                 <div className={cn("p-2 rounded-xl backdrop-blur-md border shadow-lg", styles.badgeBg)}>
                   <TierIcon className={cn("w-5 h-5", styles.iconColor)} />
                 </div>
              </div>

              {/* Bottom Fade & Meta Data */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-4 lg:p-6 z-10">
                
                {/* Small Club Name */}
                <p className="text-white/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-3 text-center">
                  {jersey.club}
                </p>
                
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="px-2 py-1 rounded bg-success/20 backdrop-blur-sm border border-success/30 text-[10px] font-bold text-success uppercase tracking-wide whitespace-nowrap">
                    {jersey.listing.currency} {jersey.listing.price.toLocaleString()}
                  </div>
                  <div className="px-2 py-1 rounded bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                    {jersey.season}
                  </div>
                  <div className="px-2 py-1 rounded bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                    {jersey.jersey_type}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
