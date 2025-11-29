'use client'

import { Search, Bell, LayoutDashboard, User, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { HeroCarousel } from "@/components/dashboard/hero/HeroCarousel";
import { ActivitySnapshot } from "@/components/home/ActivitySnapshot";
import { QuickActions } from "@/components/home/QuickActions";
import { MarketplaceForYou } from "@/components/home/MarketplaceForYou";
import { CommunityPreview } from "@/components/home/CommunityPreview";
import { RightSidebar } from "@/components/home/RightSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const Home = () => {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header - Full Width */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
         <div className="max-w-full px-6 h-16 flex items-center justify-between gap-4">
           
           {/* Left: Page Title */}
           <div className="flex items-center gap-2">
             <h1 className="text-lg font-bold tracking-tight text-foreground uppercase hidden md:block">Dashboard</h1>
           </div>

           {/* Right: Actions */}
           <div className="flex items-center gap-2">
             
             {/* 1. Search Trigger (Round Glass Button) */}
             <Button 
               variant="ghost" 
               size="icon" 
               onClick={() => window.dispatchEvent(new Event("openCommandBar"))}
               className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/10"
             >
               <Search className="h-5 w-5" />
             </Button>

             {/* 2. Notifications Dropdown */}
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/10 group">
                   <Bell className="h-5 w-5 group-hover:scale-105 transition-transform" />
                   {/* Lime Dot Indicator */}
                   <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-primary rounded-full ring-2 ring-[#0a0a0a] animate-pulse"></span>
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-80 md:w-96 p-0 border-white/10 bg-[#141414]/95 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden mt-2">
                 <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                   <div className="flex items-center gap-2">
                     <h4 className="font-semibold text-sm text-white">Notifications</h4>
                     <Badge variant="brand" className="h-5 px-1.5 text-[10px] font-mono">3</Badge>
                   </div>
                   <button onClick={() => router.push("/notifications")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                     View all
                   </button>
                 </div>
                 <div className="max-h-[400px] overflow-y-auto p-4 text-center text-muted-foreground text-sm">
                    <p>No new notifications</p>
                 </div>
               </DropdownMenuContent>
             </DropdownMenu>

             {/* 3. User Avatar Dropdown */}
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent p-0 ml-2 ring-2 ring-white/5 hover:ring-white/20 transition-all">
                   <Avatar className="h-10 w-10">
                     <AvatarImage src={user?.imageUrl} alt={user?.username || "User"} />
                     <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        <User className="w-5 h-5" />
                     </AvatarFallback>
                   </Avatar>
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent className="w-56 border-white/10 bg-[#141414]/95 backdrop-blur-xl" align="end" forceMount>
                 <DropdownMenuLabel className="font-normal p-3">
                   <div className="flex flex-col space-y-1">
                     <p className="text-sm font-medium leading-none text-white">{user?.fullName || user?.username || "User"}</p>
                     <p className="text-xs leading-none text-muted-foreground">
                       {user?.primaryEmailAddress?.emailAddress}
                     </p>
                   </div>
                 </DropdownMenuLabel>
                 <DropdownMenuSeparator className="bg-white/10" />
                 <DropdownMenuGroup>
                   <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer" onClick={() => router.push("/")}>
                     <LayoutDashboard className="mr-2 h-4 w-4" />
                     <span>Dashboard</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer" onClick={() => router.push("/profile")}>
                     <User className="mr-2 h-4 w-4" />
                     <span>Profile</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer" onClick={() => router.push("/settings")}>
                     <Settings className="mr-2 h-4 w-4" />
                     <span>Settings</span>
                   </DropdownMenuItem>
                 </DropdownMenuGroup>
                 <DropdownMenuSeparator className="bg-white/10" />
                 <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10 hover:text-red-500 hover:bg-red-500/10 cursor-pointer" onClick={handleSignOut}>
                   <LogOut className="mr-2 h-4 w-4" />
                   <span>Log out</span>
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>

           </div>
         </div>
      </header>

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
    </div>
  );
};

export default Home;
