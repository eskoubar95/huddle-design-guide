'use client'

import { Home, ShoppingBag, Shirt, MessageSquare, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/marketplace", icon: ShoppingBag, label: "Shop" },
  { href: "/create", icon: Plus, label: "Create", isAction: true }, // Central Action
  { href: "/wardrobe", icon: Shirt, label: "Wardrobe" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

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

  const handleNavClick = (href: string, isAction: boolean | undefined, e: React.MouseEvent) => {
    // Protect certain routes
    if (!user && (href === "/wardrobe" || href === "/messages" || href === "/create")) {
      e.preventDefault();
      router.push("/auth");
      return;
    }
    
    // Handle Create Action (could open modal instead)
    if (isAction) {
       // For now navigation, but ideally opens a drawer
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 pb-safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-16 items-center">
        {navItems.map(({ href, icon: Icon, label, isAction }) => {
          const isActive = pathname === href;
          
          if (isAction) {
             return (
               <div key={href} className="flex items-center justify-center -mt-6">
                 <Link
                   href={href}
                   onClick={(e) => handleNavClick(href, isAction, e)}
                   className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_20px_hsl(90_100%_50%_/_0.4)] hover:scale-105 transition-transform active:scale-95"
                 >
                   <Icon className="w-7 h-7" />
                 </Link>
               </div>
             )
          }

          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleNavClick(href, isAction, e)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative group p-1",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative p-1.5 rounded-full transition-all duration-300",
                isActive ? "bg-primary/10 shadow-[0_0_10px_hsl(90_100%_50%_/_0.2)]" : "bg-transparent group-hover:bg-white/5"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "fill-primary/20")} />
                {label === "Messages" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary border-2 border-background flex items-center justify-center animate-pulse">
                    <span className="text-[9px] text-primary-foreground font-bold leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

