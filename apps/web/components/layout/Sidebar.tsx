'use client'

import { Home, ShoppingBag, Shirt, Users, User, Bell, Settings, MessageSquare, LogOut, LogIn } from "lucide-react";
import { SidebarNavLink } from "@/components/profile/SidebarNavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    const fetchUnreadCount = async () => {
      try {
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

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      router.push("/auth");
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-card border-r border-border z-50">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">Huddle</h1>
        <p className="text-xs text-muted-foreground mt-1">Jersey Collection</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <SidebarNavLink href="/" icon={Home} label="Home" />
        <SidebarNavLink href="/marketplace" icon={ShoppingBag} label="Marketplace" />
        <SidebarNavLink href="/wardrobe" icon={Shirt} label="Wardrobe" />
        <SidebarNavLink href="/community" icon={Users} label="Community" />
        <SidebarNavLink href="/profile" icon={User} label="Profile" />
        <div className="pt-4 mt-4 border-t border-border">
          <SidebarNavLink href="/messages" icon={MessageSquare} label="Messages" badge={unreadCount} />
          <SidebarNavLink href="/notifications" icon={Bell} label="Notifications" />
          <SidebarNavLink href="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        {user && (
          <div className="text-xs text-muted-foreground mb-2">
            Signed in as <span className="font-medium">{user.email}</span>
          </div>
        )}
        <Button
          variant="outline"
          onClick={handleAuthAction}
          className="w-full justify-start gap-2"
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
        <p className="text-xs text-muted-foreground">© 2024 Huddle</p>
      </div>
    </aside>
  );
};

