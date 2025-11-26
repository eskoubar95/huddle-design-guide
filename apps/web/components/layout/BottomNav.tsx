'use client'

import { Home, ShoppingBag, Shirt, Users, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/marketplace", icon: ShoppingBag, label: "Shop" },
  { href: "/wardrobe", icon: Shirt, label: "Wardrobe" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
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
      .channel("unread-messages-bottom")
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

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    // Protect certain routes
    if (!user && (href === "/wardrobe" || href === "/messages")) {
      e.preventDefault();
      router.push("/auth");
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="grid grid-cols-5 h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleNavClick(href, e)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {label === "Messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] text-primary-foreground font-bold leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </span>
                )}
              </div>
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

