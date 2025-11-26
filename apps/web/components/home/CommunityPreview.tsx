'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            profiles!inner(username, avatar_url),
            jerseys(images, club, season)
          `)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) {
          console.error("Error fetching posts:", {
            message: error.message,
            code: error.code,
            details: error.details,
          });
          return;
        }

        if (data) {
          // Type assertion needed due to Supabase query structure
          // Supabase returns null for nullable fields, not undefined
          // Also handles SelectQueryError for missing relations
          // Using 'any' temporarily to handle Supabase's complex return types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const typedPosts = data.map((post: any) => {
            // Handle profiles - can be object, null, or SelectQueryError
            const profiles = post.profiles && typeof post.profiles === 'object' && 'username' in post.profiles
              ? post.profiles
              : null;
            
            return {
              id: post.id,
              content: post.content || "",
              created_at: post.created_at,
              user_id: post.user_id,
              jersey_id: post.jersey_id || undefined,
              profiles: {
                username: profiles?.username || "Unknown",
                avatar_url: profiles?.avatar_url || undefined,
              },
              jerseys: post.jerseys ? {
                images: post.jerseys.images || [],
                club: post.jerseys.club,
                season: post.jerseys.season,
              } : undefined,
              likes_count: post.likes_count || undefined,
              comments_count: post.comments_count || undefined,
            };
          }) as Post[];
          setPosts(typedPosts);
        }
      } catch (error) {
        console.error("Unexpected error fetching posts:", error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleNavigateToCommunity = () => {
    router.push("/community");
  };

  return (
    <div className="space-y-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-primary rounded-full" />
          <h2 className="text-2xl font-bold">From The Community</h2>
          <Users className="w-5 h-5 text-primary" />
        </div>
        <button
          onClick={handleNavigateToCommunity}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          aria-label="Open community feed"
        >
          <span>Open feed</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" role="status">
          No posts yet. Be the first to share!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={handleNavigateToCommunity}
                className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-card focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={`View post by ${post.profiles.username}`}
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
                      <MessageCircle className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
                  
                  {/* User info */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 border border-background">
                        <AvatarImage src={post.profiles.avatar_url} alt={post.profiles.username} />
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
                      <Heart className="w-3 h-3 text-primary fill-primary" aria-hidden="true" />
                      <span className="text-xs font-medium">{post.likes_count}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={handleNavigateToCommunity}
            variant="outline"
            className="w-full h-12 border-primary/30 hover:bg-primary/10"
            aria-label="Open community feed"
          >
            Open Community Feed
          </Button>
        </>
      )}
    </div>
  );
};

