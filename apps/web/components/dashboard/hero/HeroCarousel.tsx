'use client'

import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Fade from "embla-carousel-fade";
import { HeroSlide } from "./HeroSlide";
import { useHeroSlides, HeroSlideData } from "@/lib/hooks/use-hero-slides";
import { UserStatsSlide } from "./slides/UserStatsSlide";
import { UploadEncouragementSlide } from "./slides/UploadEncouragementSlide";
import { AuctionSlide } from "./slides/AuctionSlide";
import { JerseySlide } from "./slides/JerseySlide";
import { SaleSlide } from "./slides/SaleSlide";
import { WelcomeSlide } from "./slides/WelcomeSlide";

export const HeroCarousel = () => {
  const { slides, isLoading } = useHeroSlides();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  // Navigation handlers passed down to individual slides
  const handlePrev = () => api?.scrollPrev();
  const handleNext = () => api?.scrollNext();
  const handleGoTo = (index: number) => api?.scrollTo(index);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-3xl min-h-[500px] 2xl:min-h-[600px] bg-card animate-pulse mx-auto max-w-[1600px]" />
    );
  }

  // Render specific Welcome slide if no slides are available (Fallback state)
  const activeSlides: HeroSlideData[] = !slides || slides.length === 0 
    ? [{ id: 'welcome', type: 'welcome', gradient: '', priority: 0 }] 
    : slides;

  return (
    <div className="relative overflow-hidden rounded-3xl mx-auto max-w-[1600px]">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: activeSlides.length > 1, // Only loop if multiple slides
        }}
        plugins={[Fade()]} // Add Fade animation
        className="w-full"
      >
        <CarouselContent>
          {activeSlides.map((slide, index) => (
            <CarouselItem key={slide.id || index}>
              <HeroSlide 
                gradient={slide.gradient} 
                backgroundImage={
                  slide.type === 'jersey' || slide.type === 'sale' 
                    ? '/hero-slide-bg-2.jpg' 
                    : undefined
                } 
              >
                {slide.type === 'welcome' && <WelcomeSlide />}
                {slide.type === 'user-stats' && (
                  <UserStatsSlide 
                    slidesCount={activeSlides.length} 
                    currentSlide={current}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onGoTo={handleGoTo}
                  />
                )}
                {slide.type === 'upload-encouragement' && <UploadEncouragementSlide />}
                {slide.type === 'auction' && (
                  <AuctionSlide 
                    slidesCount={activeSlides.length} 
                    currentSlide={current}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onGoTo={handleGoTo}
                  />
                )}
                {slide.type === 'jersey' && (
                  <JerseySlide 
                    slide={slide} 
                    slidesCount={activeSlides.length} 
                    currentSlide={current}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onGoTo={handleGoTo}
                  />
                )}
                {slide.type === 'sale' && (
                  <SaleSlide 
                    slide={slide} 
                    slidesCount={activeSlides.length} 
                    currentSlide={current}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onGoTo={handleGoTo}
                  />
                )}
              </HeroSlide>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
