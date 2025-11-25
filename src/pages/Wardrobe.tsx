import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { JerseyCard } from "@/components/JerseyCard";
import { UploadJersey } from "@/components/UploadJersey";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mockJerseys = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=600&fit=crop",
    club: "FC Barcelona",
    season: "2023/24",
    type: "Home",
    player: "Messi #10",
    condition: 9,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop",
    club: "Real Madrid",
    season: "2022/23",
    type: "Away",
    player: "Benzema #9",
    condition: 8,
    forSale: true,
    price: "€299",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=600&fit=crop",
    club: "Manchester United",
    season: "2021/22",
    type: "Third",
    condition: 10,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=600&fit=crop",
    club: "Bayern Munich",
    season: "2023/24",
    type: "Home",
    condition: 9,
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=600&fit=crop",
    club: "Liverpool",
    season: "2022/23",
    type: "Home",
    player: "Salah #11",
    condition: 7,
  },
  {
    id: "6",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop",
    club: "PSG",
    season: "2023/24",
    type: "Away",
    condition: 10,
    forSale: true,
    price: "€399",
  },
];

const filters = ["All", "Public", "Private", "For Sale", "Auctions"];

const Wardrobe = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <UploadJersey isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">My Wardrobe</h1>
              <p className="text-sm text-muted-foreground">{mockJerseys.length} jerseys</p>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full border-border hover:border-primary hover:text-primary"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-smooth border",
                  activeFilter === filter
                    ? "bg-secondary text-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:border-muted"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Jersey Grid */}
      <div className="px-4 lg:px-8 pt-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mockJerseys.map((jersey) => (
              <JerseyCard key={jersey.id} {...jersey} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setUploadOpen(true)}
        className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-elevated transition-smooth"
      >
        <Plus className="w-6 h-6 text-primary-foreground mx-auto" />
      </button>

        <BottomNav />
      </div>
    </>
  );
};

export default Wardrobe;
