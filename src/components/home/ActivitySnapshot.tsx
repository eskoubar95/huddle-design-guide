import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shirt, Store, Gavel, Heart, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const ActivitySnapshot = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    jerseyCount: 0,
    forSaleCount: 0,
    activeAuctions: 0,
    weeklyLikes: 0,
    followerCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const [jerseys, sales, auctions, followers] = await Promise.all([
        supabase
          .from("jerseys")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id),
        
        supabase
          .from("sale_listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .eq("status", "active"),
        
        supabase
          .from("auctions")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .eq("status", "active"),
        
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", user.id),
      ]);

      setStats({
        jerseyCount: jerseys.count || 0,
        forSaleCount: sales.count || 0,
        activeAuctions: auctions.count || 0,
        weeklyLikes: 0, // We'll implement this later
        followerCount: followers.count || 0,
      });
    };

    fetchStats();
  }, [user]);

  const statCards = [
    {
      icon: Shirt,
      label: "Wardrobe",
      value: stats.jerseyCount,
      subtitle: "Jerseys Collected",
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate("/wardrobe"),
    },
    {
      icon: Store,
      label: "For Sale",
      value: stats.forSaleCount,
      subtitle: "Active Listings",
      color: "text-accent",
      bgColor: "bg-accent/10",
      onClick: () => navigate("/marketplace"),
    },
    {
      icon: Gavel,
      label: "Auctions",
      value: stats.activeAuctions,
      subtitle: "Live Bids",
      color: "text-success",
      bgColor: "bg-success/10",
      onClick: () => navigate("/marketplace"),
    },
    {
      icon: Users,
      label: "Followers",
      value: stats.followerCount,
      subtitle: "This Week",
      color: "text-foreground",
      bgColor: "bg-secondary",
      onClick: () => navigate("/profile"),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-primary rounded-full" />
        <h2 className="text-2xl font-bold">Your Huddle Snapshot</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className="group relative overflow-hidden p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-card hover:-translate-y-1"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-transparent to-primary/5" />
            
            <div className="relative space-y-4">
              <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold">{card.value}</div>
                <div className="text-sm text-muted-foreground">{card.subtitle}</div>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>{card.label}</span>
                <TrendingUp className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};