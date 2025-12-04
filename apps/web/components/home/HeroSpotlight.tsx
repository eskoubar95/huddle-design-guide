'use client'

import { Timer, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export const HeroSpotlight = () => {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push("/marketplace");
  };

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-elevated animate-fade-in stadium-glow">
      {/* Stadium gradient background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 gradient-stadium" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-40" />
      
      {/* Neon glow effects */}
      <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-primary/20 via-transparent to-transparent blur-3xl" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-success/15 via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1/2 bg-gradient-to-t from-accent/10 via-transparent to-transparent blur-3xl" />

      <div className="relative p-12 md:p-20 min-h-[500px] flex flex-col justify-center">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 backdrop-blur-sm mb-6 shadow-glow">
              <TrendingUp className="w-5 h-5 text-accent animate-pulse" aria-hidden="true" />
              <span className="text-sm font-bold text-accent uppercase tracking-wider">Featured Drop</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-3 text-gradient-neon uppercase tracking-tight">
              Spotlight Jersey
            </h2>
            <p className="text-muted-foreground text-xl font-medium">
              Rare Collection of the Week
            </p>
          </div>

          <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-background/60 backdrop-blur-sm border border-primary/30 neon-border shadow-neon">
            <Timer className="w-5 h-5 text-primary animate-pulse" aria-hidden="true" />
            <span className="text-base font-bold">2d 20h</span>
          </div>
        </div>

        {/* Hero content */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Jersey showcase */}
          <div className="relative group">
            <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-neon border-2 border-primary/30 neon-border">
              <img
                src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=800&fit=crop"
                alt="Featured Jersey - FC Barcelona 2013/14 Home, Messi #10"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-background via-background/80 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium text-muted-foreground">Verified Authentic</span>
                </div>
                <h3 className="text-2xl font-bold mb-1">FC Barcelona</h3>
                <p className="text-muted-foreground">2013/14 Home • Messi #10</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-black text-gradient-neon">€549</span>
                <span className="text-xl text-muted-foreground line-through">€799</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Condition</div>
                  <div className="text-2xl font-bold">9.5/10</div>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Rarity</div>
                  <div className="text-2xl font-bold text-accent">Rare</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">• Champions League Final</span>
                  <span className="text-foreground" aria-label="Included">✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">• Original Tags</span>
                  <span className="text-foreground" aria-label="Included">✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">• Player Signed</span>
                  <span className="text-foreground" aria-label="Included">✓</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleViewDetails}
                className="flex-1 h-14 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity shadow-neon uppercase tracking-wide"
                aria-label="View jersey details"
              >
                View Details
              </Button>
              <Button
                variant="outline"
                className="h-14 px-8 text-base font-bold border-2 border-primary/40 hover:bg-primary/10 neon-border"
                aria-label="Save jersey"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


