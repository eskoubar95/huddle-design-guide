'use client'

import { useRouter } from "next/navigation";
import { Shirt, Store, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStats } from "@/lib/hooks/use-user-stats";
import { useUser } from "@clerk/nextjs";
import { HeroNavigation } from "../HeroNavigation";
// HeroSlideData import removed - not used

interface UserStatsSlideProps {
  slidesCount?: number;
  currentSlide?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onGoTo?: (index: number) => void;
}

export const UserStatsSlide = ({ 
  slidesCount = 0, 
  currentSlide = 0,
  onPrev = () => {},
  onNext = () => {},
  onGoTo = () => {}
}: UserStatsSlideProps) => {
  const router = useRouter();
  const { user } = useUser();
  const { data: stats, isLoading } = useUserStats();

  if (isLoading || !stats) {
    return null; // Don't show slide if no user or loading
  }

  const username = user?.username || user?.firstName || "Your";

  return (
    <div className="relative h-full w-full flex flex-col justify-between p-4 md:p-8 lg:p-8 2xl:p-12">
      {/* Top Left - Title */}
      <div className="z-10">
        <h2 className="text-xl md:text-2xl font-mono text-white font-bold tracking-widest uppercase">
           {username}&apos;s
        </h2>
        <h2 className="text-3xl md:text-4xl lg:text-4xl 2xl:text-6xl font-black text-white uppercase tracking-tight leading-none">
          Wardrobe
        </h2>
      </div>

      {/* Central Left - Glass Card Stats + Navigation */}
      <div className="z-10 w-full max-w-[300px] my-auto">
        <div className="rounded-2xl bg-background/20 backdrop-blur-md border border-white/10 p-4 space-y-3 shadow-xl">
           <div className="flex items-center justify-between border-b border-white/10 pb-2">
             <div className="flex items-center gap-3">
               <div className="p-1.5 rounded-lg bg-white/10">
                 <Shirt className="w-4 h-4 text-white" />
               </div>
               <span className="text-sm font-medium text-white/80">Jerseys</span>
             </div>
             <span className="text-xl font-bold text-white">{stats.jerseyCount}</span>
           </div>
           
           <div className="flex items-center justify-between border-b border-white/10 pb-2">
             <div className="flex items-center gap-3">
               <div className="p-1.5 rounded-lg bg-white/10">
                 <Store className="w-4 h-4 text-white" />
               </div>
               <span className="text-sm font-medium text-white/80">For Sale</span>
             </div>
             <span className="text-xl font-bold text-white">{stats.forSaleCount}</span>
           </div>

           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-1.5 rounded-lg bg-white/10">
                 <Gavel className="w-4 h-4 text-white" />
               </div>
               <span className="text-sm font-medium text-white/80">Auctions</span>
             </div>
             <span className="text-xl font-bold text-white">{stats.activeAuctions}</span>
           </div>
        </div>

        
      </div>

      {/* Bottom Left - CTA */}
      <div className="z-10">
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
          onClick={() => router.push("/wardrobe")}
          variant="secondary"
          className="font-semibold bg-white text-black hover:bg-white/90 border-none shadow-lg w-full md:w-auto"
        >
          Manage Wardrobe
        </Button>
      </div>

      {/* Right Side - Empty/Graphic (handled by background image in parent) */}
    </div>
  );
};
