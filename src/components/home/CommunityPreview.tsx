import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  jersey_id?: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
  jerseys?: {
    images: string[];
    club: string;
    season: string;
  };
  likes_count?: number;
  comments_count?: number;
}

export const CommunityPreview = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!inner(username, avatar_url),
          jerseys(images, club, season)
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) setPosts(data as any);
    };

    fetchPosts();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-primary rounded-full" />
          <h2 className="text-2xl font-bold">From The Community</h2>
          <Users className="w-5 h-5 text-primary" />
        </div>
        <button
          onClick={() => navigate("/community")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span>Open feed</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => navigate("/community")}
            className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-card"
          >
            {/* Jersey image or placeholder */}
            <div className="aspect-square relative overflow-hidden">
              {post.jerseys ? (
                <img
                  src={post.jerseys.images[0]}
                  alt={`${post.jerseys.club} jersey`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
              
              {/* User info */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6 border border-background">
                    <AvatarImage src={post.profiles.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {post.profiles.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground truncate">
                    {post.profiles.username}
                  </span>
                </div>
              </div>

              {/* Like indicator */}
              {post.likes_count && post.likes_count > 0 && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm flex items-center gap-1">
                  <Heart className="w-3 h-3 text-primary fill-primary" />
                  <span className="text-xs font-medium">{post.likes_count}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={() => navigate("/community")}
        variant="outline"
        className="w-full h-12 border-primary/30 hover:bg-primary/10"
      >
        Open Community Feed
      </Button>
    </div>
  );
};