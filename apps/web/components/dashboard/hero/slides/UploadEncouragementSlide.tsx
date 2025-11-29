'use client'

import { useRouter } from "next/navigation";
import { Upload, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const UploadEncouragementSlide = () => {
  const router = useRouter();

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* CTA Section - Left */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-6 shadow-glow">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" aria-hidden="true" />
            <span className="text-sm font-bold text-primary uppercase tracking-wider">Start Your Collection</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black mb-3 text-gradient-neon uppercase tracking-tight">
            Upload Your First Jersey
          </h2>
          <p className="text-muted-foreground text-xl font-medium">
            Build your collection and connect with fellow collectors
          </p>
        </div>

        <div className="space-y-4">
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">1</span>
              </div>
              <span>Add jerseys to your wardrobe</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">2</span>
              </div>
              <span>Track your collection stats</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">3</span>
              </div>
              <span>Share with the community</span>
            </li>
          </ul>

          <Button
            onClick={() => router.push("/wardrobe?action=upload")}
            className="h-14 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity shadow-neon uppercase tracking-wide w-full"
          >
            <Upload className="mr-2 w-5 h-5" />
            Upload Jersey
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Illustration/Visual - Right */}
      <div className="relative group">
        <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-neon border-2 border-primary/30 neon-border bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Upload className="w-24 h-24 text-primary/50 mx-auto animate-pulse" />
            <p className="text-muted-foreground text-sm">Upload your first jersey to get started</p>
          </div>
        </div>
      </div>
    </div>
  );
};

