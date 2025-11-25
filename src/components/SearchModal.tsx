import { useState } from "react";
import { Search, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JerseyCard } from "./JerseyCard";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tabs = ["Jerseys", "Users", "Clubs", "Players"];

const mockSearchResults = {
  jerseys: [
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
      condition: 8,
    },
  ],
  users: [
    { id: "1", name: "JerseyCollector23", country: "Spain", followers: 1234 },
    { id: "2", name: "FootballKits", country: "England", followers: 5678 },
  ],
};

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [activeTab, setActiveTab] = useState("Jerseys");
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jerseys, users, clubs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-11"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-smooth border",
                  activeTab === tab
                    ? "bg-secondary text-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {query ? (
            <div>
              {activeTab === "Jerseys" && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {mockSearchResults.jerseys.map((jersey) => (
                    <JerseyCard key={jersey.id} {...jersey} />
                  ))}
                </div>
              )}

              {activeTab === "Users" && (
                <div className="space-y-2 max-w-2xl mx-auto">
                  {mockSearchResults.users.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 bg-card rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.country} • {user.followers.toLocaleString()} followers
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "Clubs" && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Club search coming soon</p>
                </div>
              )}

              {activeTab === "Players" && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Player search coming soon</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Start typing to search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
