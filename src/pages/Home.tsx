import { useState } from "react";
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
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header with gradient glow */}
      <header className="relative pt-8 pb-6 px-4 lg:px-8">
        <div
          className="absolute top-0 left-0 right-0 h-32 opacity-40"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="relative z-10 max-w-7xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-bold mb-1 text-foreground">Huddle</h1>
          <p className="text-sm text-muted-foreground">Your jersey collection community</p>
        </div>
      </header>

      {/* Tab Toggle */}
      <div className="px-4 lg:px-8 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 p-1 rounded-xl bg-secondary max-w-md">
            <button
              onClick={() => setActiveTab("following")}
              className={cn(
                "flex-1 py-2.5 rounded-lg font-medium text-sm transition-smooth",
                activeTab === "following"
                  ? "bg-card text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Following
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={cn(
                "flex-1 py-2.5 rounded-lg font-medium text-sm transition-smooth",
                activeTab === "explore"
                  ? "bg-card text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Explore
            </button>
          </div>
        </div>
      </div>

      {/* Jersey Grid */}
      <div className="px-4 lg:px-8">
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
  );
};

export default Home;
