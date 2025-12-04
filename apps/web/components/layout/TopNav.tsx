'use client'

import { useState, useEffect } from "react";
import { Search, Bell, LayoutDashboard, User, Settings, LogOut, ChevronLeft, Share2, Save } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Map pathnames to page titles
const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/wardrobe': 'Wardrobe',
  '/marketplace': 'Marketplace',
  '/community': 'Community',
  '/profile': 'Profile',
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export const TopNav = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prevent hydration mismatch by only rendering DropdownMenus after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for unsaved changes updates from edit page
  useEffect(() => {
    const handleUnsavedChangesUpdate = (e: CustomEvent<{ hasChanges: boolean }>) => {
      setHasUnsavedChanges(e.detail.hasChanges);
    };

    window.addEventListener('unsavedChangesUpdate', handleUnsavedChangesUpdate as EventListener);
    return () => {
      window.removeEventListener('unsavedChangesUpdate', handleUnsavedChangesUpdate as EventListener);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth");
  };

  // Check if we're on a jersey detail page or edit page
  const isJerseyDetailPage = pathname?.startsWith('/wardrobe/') && pathname !== '/wardrobe' && !pathname?.endsWith('/edit');
  const isEditPage = pathname?.endsWith('/edit');
  
  // Get page title from pathname, default to "Dashboard"
  const pageTitle = pageTitles[pathname] || (isJerseyDetailPage ? 'Jersey Details' : isEditPage ? 'Edit Jersey' : 'Dashboard');

  // Handle back button with unsaved changes check for edit page
  const handleBack = () => {
    if (isEditPage) {
      // Dispatch custom event to check for unsaved changes
      // The edit page will handle navigation
      const navigateFn = () => router.back();
      const event = new CustomEvent('checkUnsavedChanges', {
        detail: { navigate: navigateFn },
        bubbles: true,
      });
      window.dispatchEvent(event);
    } else {
      router.back();
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Jersey link copied to clipboard",
      });
    }
  };

  const handleSave = () => {
    // Dispatch event to edit page to trigger save
    window.dispatchEvent(new CustomEvent('saveJersey'));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="max-w-full px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Back Button (if jersey detail or edit) + Page Title */}
        <div className="flex items-center gap-2">
          {(isJerseyDetailPage || isEditPage) ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold tracking-tight text-foreground uppercase hidden md:block">
                {pageTitle}
              </h1>
            </>
          ) : (
            <h1 className="text-lg font-bold tracking-tight text-foreground uppercase hidden md:block">
              {pageTitle}
            </h1>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          
          {/* Save Button (only on edit page) */}
          {isEditPage && (
            <Button 
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={`h-10 w-10 rounded-full transition-all border ${
                hasUnsavedChanges 
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground border-primary/50 hover:border-primary" 
                  : "bg-white/5 hover:bg-white/10 text-muted-foreground border-transparent hover:border-white/10"
              }`}
            >
              <Save className="h-5 w-5" />
            </Button>
          )}
          
          {/* Share Button (only on jersey detail page, not edit) */}
          {isJerseyDetailPage && !isEditPage && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleShare}
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
          
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
          {mounted ? (
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
          ) : (
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/10 group">
              <Bell className="h-5 w-5 group-hover:scale-105 transition-transform" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-primary rounded-full ring-2 ring-[#0a0a0a] animate-pulse"></span>
            </Button>
          )}

          {/* 3. User Avatar Dropdown */}
          {mounted ? (
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
          ) : (
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent p-0 ml-2 ring-2 ring-white/5 hover:ring-white/20 transition-all">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.imageUrl} alt={user?.username || "User"} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                   <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          )}

        </div>
      </div>
    </header>
  );
};

