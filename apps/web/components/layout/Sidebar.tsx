'use client'

import { Home, ShoppingBag, Shirt, Users, User, Bell, Settings, MessageSquare, LogOut, LogIn } from "lucide-react";
import { SidebarNavLink } from "@/components/profile/SidebarNavLink";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const Sidebar = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering user-dependent content after mount
  // This pattern is required for SSR hydration safety in Next.js
  // The setState in effect is intentional and necessary for proper hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    const fetchUnreadCount = async () => {
      try {
        if (!user?.id) return;

        const { data: conversations, error } = await supabase
          .from("conversations")
          .select(`
            id,
            participant_1_id,
            participant_2_id,
            messages!inner(read, sender_id)
          `)
          .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

        if (error) {
          console.error("Error fetching unread count:", error);
          setUnreadCount(0);
          return;
        }

        interface Message {
          read: boolean;
          sender_id: string;
        }

        const count = conversations?.reduce((acc, conv) => {
          return acc + (conv.messages as Message[]).filter((m) => !m.read && m.sender_id !== user.id).length;
        }, 0) || 0;

        setUnreadCount(count);
      } catch (error) {
        console.error("Error in fetchUnreadCount:", error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();

    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
      router.push("/auth");
    } else {
      router.push("/auth");
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-background/50 backdrop-blur-xl border-r border-white/5 z-50">
      {/* Logo */}
      <div className="p-6">
        <img src="/Primary Logo White SVG.svg" alt="Huddle" className="h-8 w-auto opacity-90" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <SidebarNavLink href="/" icon={Home} label="Home" />
        <SidebarNavLink href="/marketplace" icon={ShoppingBag} label="Marketplace" />
        <SidebarNavLink href="/wardrobe" icon={Shirt} label="Wardrobe" />
        <SidebarNavLink href="/community" icon={Users} label="Community" />
        <SidebarNavLink href="/profile" icon={User} label="Profile" />
        <div className="pt-4 mt-4 border-t border-white/5">
          <SidebarNavLink href="/messages" icon={MessageSquare} label="Messages" badge={unreadCount} />
          <SidebarNavLink href="/notifications" icon={Bell} label="Notifications" />
          <SidebarNavLink href="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {mounted && isLoaded && user && (
          <div className="text-xs text-muted-foreground mb-2 px-2">
            Signed in as <span className="font-medium text-foreground">{user.emailAddresses[0]?.emailAddress || user.username || "User"}</span>
          </div>
        )}
        {mounted && isLoaded ? (
          <Button
            variant="ghost"
            onClick={handleAuthAction}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            {user ? (
              <>
                <LogOut className="w-4 h-4" />
                Log Out
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Log In
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5"
            disabled
          >
            <LogIn className="w-4 h-4" />
            Log In
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground text-center pt-2 opacity-50">© 2024 Huddle</p>
      </div>
    </aside>
  );
};

