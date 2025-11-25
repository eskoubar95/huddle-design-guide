import { useState } from "react";
import { Search } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { JerseyCard } from "@/components/JerseyCard";
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
    forSale: true,
    price: "€249",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop",
    club: "Real Madrid",
    season: "2022/23",
    type: "Away",
    player: "Benzema #9",
    condition: 8,
    isLiked: true,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=600&fit=crop",
    club: "Manchester United",
    season: "2021/22",
    type: "Third",
    condition: 10,
    isSaved: true,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=600&fit=crop",
    club: "Bayern Munich",
    season: "2023/24",
    type: "Home",
    player: "Müller #25",
    condition: 9,
    forSale: true,
    price: "€189",
  },
];

const Home = () => {
  const [activeTab, setActiveTab] = useState<"following" | "explore">("explore");

  return (
    <>
      <div className="min-h-screen pb-20 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-foreground">Huddle</h1>
              <button
                onClick={() => window.dispatchEvent(new Event("openCommandBar"))}
                className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("following")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "following"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Following
              </button>
              <button
                onClick={() => setActiveTab("explore")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "explore"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Explore
              </button>
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

        <BottomNav />
      </div>
    </>
  );
};

export default Home;
