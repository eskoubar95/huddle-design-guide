'use client'

import { HeroCarousel } from "@/components/dashboard/hero/HeroCarousel";
import { ActivitySnapshot } from "@/components/home/ActivitySnapshot";
import { QuickActions } from "@/components/home/QuickActions";
import { MarketplaceForYou } from "@/components/home/MarketplaceForYou";
import { CommunityPreview } from "@/components/home/CommunityPreview";
import { RightSidebar } from "@/components/home/RightSidebar";

const Home = () => {
  return (
    <div className="flex flex-1">
      {/* Main Content */}
      <main className="flex-1 mx-auto px-4 lg:px-8 py-8 w-full">
        
        {/* Top Section: Hero & Stats Grouped */}
        <div className="space-y-6 mb-12">
          <HeroCarousel />
          <ActivitySnapshot />
        </div>

        {/* Quick Actions - Mid Level */}
        <div className="mb-16">
           <QuickActions />
        </div>

        {/* Content Sections - Spaced out */}
        <div className="space-y-16">
          <MarketplaceForYou />
          <CommunityPreview />
        </div>
      </main>

      {/* Right Sidebar - Desktop Only */}
      <aside className="hidden xl:block w-72 border-l border-border sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <RightSidebar />
      </aside>
    </div>
  );
};

export default Home;
