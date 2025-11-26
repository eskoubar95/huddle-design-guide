'use client'

import { useRouter } from "next/navigation";
import { Upload, Store, Gavel, MapPin, Sparkles } from "lucide-react";

export const QuickActions = () => {
  const router = useRouter();

  const actions = [
    {
      icon: Upload,
      title: "Upload Jersey",
      description: "Add to wardrobe",
      gradient: "from-primary/20 to-primary-glow/20",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      onClick: () => router.push("/wardrobe"),
    },
    {
      icon: Store,
      title: "List For Sale",
      description: "Start earning",
      gradient: "from-accent/20 to-accent-glow/20",
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      onClick: () => router.push("/wardrobe"),
    },
    {
      icon: Gavel,
      title: "Start Auction",
      description: "Maximize value",
      gradient: "from-success/20 to-success/10",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      onClick: () => router.push("/wardrobe"),
    },
    {
      icon: MapPin,
      title: "Find Nearby",
      description: "Local collection",
      gradient: "from-foreground/10 to-transparent",
      iconBg: "bg-secondary",
      iconColor: "text-foreground",
      onClick: () => router.push("/marketplace"),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-accent rounded-full animate-pulse-glow" />
        <h2 className="text-3xl font-black uppercase tracking-tight">Quick Actions</h2>
        <Sparkles className="w-6 h-6 text-accent animate-pulse" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="group relative overflow-hidden p-8 rounded-3xl bg-card border-2 border-border hover:border-primary/40 transition-all hover:shadow-neon hover:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`${action.title}: ${action.description}`}
          >
            {/* Animated neon gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative space-y-6">
              <div className={`w-16 h-16 rounded-2xl ${action.iconBg} flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 shadow-lg neon-border`}>
                <action.icon className={`w-8 h-8 ${action.iconColor}`} aria-hidden="true" />
              </div>

              <div className="space-y-2 text-left">
                <div className="text-xl font-black">{action.title}</div>
                <div className="text-sm text-muted-foreground font-medium">{action.description}</div>
              </div>

              {/* Animated arrow */}
              <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-primary/0 group-hover:bg-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 neon-border">
                <span className="text-primary text-lg font-bold" aria-hidden="true">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

