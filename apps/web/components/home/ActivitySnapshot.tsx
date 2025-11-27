'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shirt, Store, Gavel, Heart, Users, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";

export const ActivitySnapshot = () => {
  const router = useRouter();
  const { user } = useUser();
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

      try {
        const supabase = createClient();
        const [jerseys, sales, auctions, followers] = await Promise.all([
          supabase
            .from("jerseys")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user?.id || ""),
          
          supabase
            .from("sale_listings")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", user?.id || "")
            .eq("status", "active"),
          
          supabase
            .from("auctions")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", user?.id || "")
            .eq("status", "active"),
          
          supabase
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("following_id", user?.id || ""),
        ]);

        setStats({
          jerseyCount: jerseys.count || 0,
          forSaleCount: sales.count || 0,
          activeAuctions: auctions.count || 0,
          weeklyLikes: 0, // We'll implement this later
          followerCount: followers.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error instanceof Error ? error.message : String(error));
      }
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
      onClick: () => router.push("/wardrobe"),
    },
    {
      icon: Store,
      label: "For Sale",
      value: stats.forSaleCount,
      subtitle: "Active Listings",
      color: "text-accent",
      bgColor: "bg-accent/10",
      onClick: () => router.push("/marketplace"),
    },
    {
      icon: Gavel,
      label: "Auctions",
      value: stats.activeAuctions,
      subtitle: "Live Bids",
      color: "text-success",
      bgColor: "bg-success/10",
      onClick: () => router.push("/marketplace"),
    },
    {
      icon: Users,
      label: "Followers",
      value: stats.followerCount,
      subtitle: "This Week",
      color: "text-foreground",
      bgColor: "bg-secondary",
      onClick: () => router.push("/profile"),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-neon rounded-full" />
        <h2 className="text-3xl font-black uppercase tracking-tight">Your Huddle Snapshot</h2>
      </div>

      {/* Unified horizontal strip */}
      <div className="relative overflow-hidden rounded-3xl bg-card border-2 border-border shadow-elevated">
        {/* Ambient glow background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-success/5 opacity-50" />
        
        <div className="relative grid grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <button
              key={card.label}
              onClick={card.onClick}
              className={`group relative p-8 hover:bg-card-hover transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                index !== statCards.length - 1 ? 'border-r border-border/50' : ''
              }`}
              aria-label={`${card.label}: ${card.value} ${card.subtitle}`}
            >
              {/* Neon separator glow */}
              {index !== statCards.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              
              {/* Hover gradient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-transparent via-transparent to-primary/10" />
              
              <div className="relative space-y-5">
                <div className={`w-14 h-14 rounded-2xl ${card.bgColor} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg`}>
                  <card.icon className={`w-7 h-7 ${card.color}`} />
                </div>

                <div className="space-y-2 text-left">
                  <div className="text-5xl font-black">{card.value}</div>
                  <div className="text-sm text-muted-foreground font-medium">{card.subtitle}</div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span>{card.label}</span>
                  <TrendingUp className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


