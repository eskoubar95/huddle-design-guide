import { BottomNav } from "@/components/BottomNav";
import { Search } from "lucide-react";

const Marketplace = () => {
  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <header className="relative pt-8 pb-6 px-4 lg:px-8 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Marketplace</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jerseys, clubs, players..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
            />
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <Search className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-sm">
            Browse and purchase jerseys from collectors around the world
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Marketplace;
