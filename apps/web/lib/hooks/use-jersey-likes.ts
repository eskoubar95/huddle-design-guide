import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface UseJerseyLikesResult {
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  handleLike: () => Promise<void>;
  handleSave: () => Promise<void>;
}

export function useJerseyLikes(jerseyId: string): UseJerseyLikesResult {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Fetch likes and saves
  useEffect(() => {
    if (!jerseyId || !user) return;

    const fetchLikesAndSaves = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // Fetch likes count
        const { count, error: likesError } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("jersey_id", jerseyId);

        if (likesError && likesError.code !== "PGRST205") {
          console.error("Error fetching likes count:", likesError);
        }
        setLikesCount(count || 0);

        // Check if user liked
        const { data: likeData, error: likeCheckError } = await supabase
          .from("likes")
          .select("id")
          .eq("jersey_id", jerseyId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (likeCheckError && likeCheckError.code !== "PGRST205") {
          console.error("Error checking like status:", likeCheckError);
        }
        setIsLiked(!!likeData);

        // Check if user saved
        const { data: saveData, error: saveCheckError } = await supabase
          .from("saved_jerseys")
          .select("id")
          .eq("jersey_id", jerseyId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (saveCheckError && saveCheckError.code !== "PGRST205") {
          console.error("Error checking save status:", saveCheckError);
        }
        setIsSaved(!!saveData);
      } catch (error) {
        console.error("Error fetching likes/saves:", error);
      }
    };

    fetchLikesAndSaves();
  }, [jerseyId, user]);

  const handleLike = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (isLiked) {
        await supabase.from("likes").delete().eq("jersey_id", jerseyId).eq("user_id", user.id);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        await supabase.from("likes").insert({ jersey_id: jerseyId, user_id: user.id });
        setLikesCount((prev) => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (isSaved) {
        await supabase.from("saved_jerseys").delete().eq("jersey_id", jerseyId).eq("user_id", user.id);
      } else {
        await supabase.from("saved_jerseys").insert({ jersey_id: jerseyId, user_id: user.id });
      }
      setIsSaved(!isSaved);
      toast({
        title: isSaved ? "Unsaved" : "Saved",
        description: isSaved ? "Removed from saved items" : "Added to saved items",
      });
    } catch (error) {
      console.error("Error toggling save:", error);
      toast({
        title: "Error",
        description: "Failed to update save status",
        variant: "destructive",
      });
    }
  };

  return {
    isLiked,
    isSaved,
    likesCount,
    handleLike,
    handleSave,
  };
}

