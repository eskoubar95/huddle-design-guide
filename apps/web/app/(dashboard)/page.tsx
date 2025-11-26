'use client'

import { Search, Bell, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { HeroSpotlight } from "@/components/home/HeroSpotlight";
import { ActivitySnapshot } from "@/components/home/ActivitySnapshot";
import { QuickActions } from "@/components/home/QuickActions";
import { MarketplaceForYou } from "@/components/home/MarketplaceForYou";
import { CommunityPreview } from "@/components/home/CommunityPreview";
import { RightSidebar } from "@/components/home/RightSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black tracking-tight text-gradient-neon uppercase">Huddle</h1>
            
              <div className="flex items-center gap-3">
                {/* Search */}
                <button
                  onClick={() => window.dispatchEvent(new Event("openCommandBar"))}
                  className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <button
                  onClick={() => router.push("/notifications")}
                  className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </button>

                {/* Avatar */}
                <button
                  onClick={() => router.push("/profile")}
                  className="w-10 h-10"
                  aria-label="Profile"
                >
                  <Avatar className="w-full h-full border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-16 w-full">
          {/* Hero Spotlight */}
          <HeroSpotlight />

          {/* Activity Snapshot */}
          <ActivitySnapshot />

          {/* Quick Actions */}
          <QuickActions />

          {/* Marketplace For You */}
          <MarketplaceForYou />

          {/* Community Preview */}
          <CommunityPreview />
        </main>
      </div>

      {/* Right Sidebar - Desktop Only */}
      <aside className="hidden xl:block w-80 border-l border-border p-6">
        <RightSidebar />
      </aside>
    </div>
  );
};

export default Home;
