import { Timer, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const HeroSpotlight = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-elevated animate-fade-in">
      {/* Background gradient with noise */}
      <div className="absolute inset-0 gradient-card opacity-90" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-30" />
      
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-to-b from-primary/20 via-transparent to-transparent blur-3xl" />

      <div className="relative p-8 md:p-12">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Featured Drop</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-2">
              Spotlight Jersey
            </h2>
            <p className="text-muted-foreground text-lg">
              Rare Collection of the Week
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/40 backdrop-blur-sm border border-border">
            <Timer className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">2d 20h</span>
          </div>
        </div>

        {/* Hero content */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Jersey showcase */}
          <div className="relative group">
            <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-card border border-border/50">
              <img
                src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=800&fit=crop"
                alt="Featured Jersey"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-background via-background/80 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
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
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gradient-primary">€549</span>
                <span className="text-muted-foreground line-through">€799</span>
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
                  <span className="text-foreground">✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">• Original Tags</span>
                  <span className="text-foreground">✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">• Player Signed</span>
                  <span className="text-foreground">✓</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/marketplace")}
                className="flex-1 h-12 text-base gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              >
                View Details
              </Button>
              <Button
                variant="outline"
                className="h-12 px-6 border-primary/30 hover:bg-primary/10"
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