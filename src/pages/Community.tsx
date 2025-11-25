import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Heart, MessageSquare, Share2, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Post } from "@/types";

const mockPosts: Post[] = [
  {
    id: "1",
    userId: "1",
    userName: "JerseyCollector23",
    userCountry: "Spain",
    content: "Just added this beauty to my collection! FC Barcelona 2009/10 Champions League final shirt. One of the best seasons ever! 🔵🔴",
    jersey: {
      id: "1",
      images: ["https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=600&fit=crop"],
      club: "FC Barcelona",
      season: "2009/10",
      type: "Home",
      badges: ["Champions League"],
      condition: 9,
      visibility: "public",
      ownerId: "1",
      ownerName: "JerseyCollector23",
      likes: 24,
      saves: 8,
      createdAt: new Date(),
    },
    likes: 24,
    comments: 5,
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: "2",
    userId: "2",
    userName: "FootballKits",
    userCountry: "England",
    content: "Does anyone have the Real Madrid 2000/01 Centenary kit? Been searching for ages!",
    likes: 12,
    comments: 8,
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: "3",
    userId: "3",
    userName: "RetroKits",
    userCountry: "Italy",
    content: "My latest pick-up from Milan. What a classic design! 🔴⚫",
    jersey: {
      id: "2",
      images: ["https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"],
      club: "AC Milan",
      season: "2003/04",
      type: "Home",
      badges: ["Champions League"],
      condition: 8,
      visibility: "public",
      ownerId: "3",
      ownerName: "RetroKits",
      likes: 18,
      saves: 6,
      createdAt: new Date(),
    },
    likes: 18,
    comments: 3,
    createdAt: new Date(Date.now() - 10800000),
  },
];

const getTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const Community = () => {
  const [activeTab, setActiveTab] = useState<"global" | "following">("global");

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          <h1 className="text-2xl font-bold mb-4">Community</h1>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("global")}
              className={cn(
                "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "global"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Global
            </button>
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
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
        <div className="space-y-4">
          {mockPosts.map((post) => (
            <div key={post.id} className="bg-card rounded-lg border border-border overflow-hidden">
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{post.userName}</div>
                    <div className="text-xs text-muted-foreground">
                      {post.userCountry} • {getTimeAgo(post.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-sm">{post.content}</p>
              </div>

              {/* Jersey Card */}
              {post.jersey && (
                <div className="px-4 pb-3">
                  <div className="bg-secondary/50 rounded-lg p-3 flex gap-3">
                    <img
                      src={post.jersey.images[0]}
                      alt=""
                      className="w-20 h-28 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{post.jersey.club}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {post.jersey.season} • {post.jersey.type}
                      </div>
                      {post.jersey.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {post.jersey.badges.map((badge, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Post Actions */}
              <div className="border-t border-border p-3 flex items-center gap-4">
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="w-4 h-4" />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-elevated transition-smooth">
        <Plus className="w-6 h-6 text-primary-foreground mx-auto" />
      </button>

      <BottomNav />
    </div>
  );
};

export default Community;
