'use client'

import { useState } from "react";
import { Gallery, Item } from "react-photoswipe-gallery";
import "photoswipe/dist/photoswipe.css";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getImageUrls } from "@/lib/utils/image";

interface JerseyImageGalleryProps {
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function JerseyImageGallery({
  images,
  currentIndex,
  onIndexChange,
}: JerseyImageGalleryProps) {
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      if (imageDimensions[url]) {
        resolve(imageDimensions[url]);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
        setImageDimensions((prev) => ({ ...prev, [url]: dimensions }));
        resolve(dimensions);
      };
      img.onerror = () => {
        const defaultDimensions = { width: 1200, height: 1600 };
        setImageDimensions((prev) => ({ ...prev, [url]: defaultDimensions }));
        resolve(defaultDimensions);
      };
      img.src = url;
    });
  };

  const handlePrevious = () => {
    onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const handleNext = () => {
    onIndexChange(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  return (
    <div className="lg:sticky lg:top-20 lg:self-start">
      <Gallery>
        <div className="relative aspect-[3/4] lg:aspect-auto lg:h-[calc(100vh-6rem)] bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
          {images.map((imageUrl, index) => {
            const imageUrls = getImageUrls(imageUrl);
            const dimensions = imageDimensions[imageUrl] || { width: 1200, height: 1600 };
            return (
              <Item
                key={index}
                original={imageUrls.fallback}
                thumbnail={imageUrls.primary}
                width={dimensions.width.toString()}
                height={dimensions.height.toString()}
              >
                {({ ref, open }) => (
                  <img
                    ref={ref}
                    src={imageUrls.primary}
                    alt={`Jersey image ${index + 1}`}
                    className={`w-full h-full object-cover cursor-pointer absolute inset-0 ${
                      index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={open}
                    onError={(e) => {
                      // Fallback to original if webp fails
                      const target = e.target as HTMLImageElement;
                      if (target.src !== imageUrls.fallback) {
                        target.src = imageUrls.fallback;
                      }
                    }}
                    onLoad={() => {
                      if (!imageDimensions[imageUrl]) {
                        getImageDimensions(imageUrl);
                      }
                    }}
                  />
                )}
              </Item>
            );
          })}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100 z-10"
                onClick={handlePrevious}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100 z-10"
                onClick={handleNext}
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* Image Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onIndexChange(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </Gallery>
    </div>
  );
}

