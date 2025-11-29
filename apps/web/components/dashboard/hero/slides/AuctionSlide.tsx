'use client'

import { useRouter } from "next/navigation";
import { Gavel, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/marketplace/CountdownTimer";
import { useFeaturedAuction } from "@/lib/hooks/use-featured-auction";
import { HeroNavigation } from "../HeroNavigation";

interface AuctionSlideProps {
  slidesCount?: number;
  currentSlide?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onGoTo?: (index: number) => void;
}

export const AuctionSlide = ({ 
  slidesCount = 0, 
  currentSlide = 0,
  onPrev = () => {},
  onNext = () => {},
  onGoTo = () => {}
}: AuctionSlideProps) => {
  const router = useRouter();
  const { data: auction, isLoading } = useFeaturedAuction();

  if (isLoading || !auction) {
    return null; // Don't show slide if no featured auction or loading
  }

  return (
    <div className="relative h-full w-full flex items-center justify-between p-6 md:p-12">
      {/* Left Content */}
      <div className="flex flex-col justify-between h-full z-10 max-w-lg">
        {/* Top Left - Title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs md:text-sm font-mono text-accent tracking-widest uppercase">
              Featured Auction
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
            {auction.club}
          </h2>
        </div>

        {/* Central Left - Glass Card Details + Navigation */}
        <div className="w-full max-w-[350px] my-auto">
          <div className="rounded-2xl bg-background/20 backdrop-blur-md border border-white/10 p-6 space-y-4 shadow-xl">
             
             {/* Season & Type */}
             <div className="flex items-center justify-between border-b border-white/10 pb-4">
               <span className="text-lg font-medium text-white">{auction.season} • {auction.jersey_type}</span>
             </div>

             {/* Current Bid */}
             <div className="space-y-1">
               <span className="text-sm font-medium text-white/60 uppercase tracking-wide">Current Bid</span>
               <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-black text-white">
                   {auction.currency} {(auction.current_bid || auction.starting_bid).toLocaleString()}
                 </span>
               </div>
             </div>

             {/* Timer */}
             <div className="flex items-center gap-2 text-accent font-mono text-lg font-bold bg-accent/10 rounded-lg p-2 justify-center border border-accent/20">
               <CountdownTimer 
                 endsAt={auction.ends_at} 
                 onExpire={() => {
                   // Optionally refetch or hide slide
                 }}
               />
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
            onClick={() => router.push(`/marketplace?auction=${auction.auction_id}`)}
            variant="secondary"
            className="font-semibold bg-white text-black hover:bg-white/90 border-none shadow-lg"
          >
            Place Bid
          </Button>
        </div>
      </div>

      {/* Right Side - Jersey Image */}
      <div className="hidden md:flex h-full w-1/2 items-center justify-center z-10">
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 transform rotate-3 hover:rotate-0 transition-transform duration-500">
          <img
            src={auction.images[0]}
            alt={`${auction.club} ${auction.season}`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
