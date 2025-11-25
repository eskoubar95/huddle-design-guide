import { Home, ShoppingBag, Shirt, Users, MessageSquare } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/marketplace", icon: ShoppingBag, label: "Shop" },
  { to: "/wardrobe", icon: Shirt, label: "Wardrobe" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { data: conversations } = await supabase
        .from("conversations")
        .select(`
          id,
          participant_1_id,
          participant_2_id,
          messages!inner(read, sender_id)
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

      const count = conversations?.reduce((acc, conv) => {
        return acc + conv.messages.filter((m: any) => !m.read && m.sender_id !== user.id).length;
      }, 0) || 0;

      setUnreadCount(count);
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

  const handleNavClick = (to: string, e: React.MouseEvent) => {
    // Protect certain routes
    if (!user && (to === "/wardrobe" || to === "/messages")) {
      e.preventDefault();
      navigate("/auth");
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="grid grid-cols-5 h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={(e) => handleNavClick(to, e)}
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
