'use client'

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useJerseys } from "./use-jerseys";
import { useListings } from "./use-listings";

export function useRecommendedJersey() {
  const { user } = useUser();

  // Fetch user's followed users
  // Note: Ideally this should be a hook useFollows(userId), but fetching directly here for now as per plan
  const { data: followedUsers, isLoading: followsLoading } = useQuery({
    queryKey: ["follows", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (error) {
        console.error("Error fetching follows:", error);
        return [];
      }

      return data?.map((f) => f.following_id) || [];
    },
    enabled: !!user,
  });

  // Fetch jerseys from followed users (limit to 100 to keep it light)
  const { data: jerseysData, isLoading: jerseysLoading } = useJerseys({
    limit: 100, 
  });

  // Fetch user's wardrobe jerseys to exclude them
  const { data: wardrobeData } = useJerseys(
    user?.id
      ? {
          ownerId: user.id,
          visibility: "all",
          limit: 1000, 
        }
      : undefined
  );

  // Fetch active listings to ensure jersey is available for sale
  const { data: listingsData } = useListings({
    status: "active",
    limit: 1000,
  });

  const recommendedJersey = useMemo(() => {
    if (!user || !followedUsers || followedUsers.length === 0) return null;
    if (!jerseysData?.items || jerseysData.items.length === 0) return null;

    const wardrobeIds = new Set(wardrobeData?.items.map((j) => j.id) || []);
    const availableJerseyIds = new Set(
      listingsData?.items.map((l) => l.jersey_id) || []
    );
    const followedUserIds = new Set(followedUsers);

    // Algorithm: Find jersey that is:
    // 1. Owned by someone the user follows
    // 2. NOT in the user's own wardrobe
    // 3. Currently listed for sale (active listing)
    const recommended = jerseysData.items.find((jersey) => {
      const isFromFollowedUser = followedUserIds.has(jersey.owner_id);
      const notInWardrobe = !wardrobeIds.has(jersey.id);
      const isAvailable = availableJerseyIds.has(jersey.id);

      return isFromFollowedUser && notInWardrobe && isAvailable;
    });

    // Attach listing details if found
    if (recommended) {
      const listing = listingsData?.items.find(
        (l) => l.jersey_id === recommended.id
      );
      return {
        ...recommended,
        listing,
      };
    }

    return null;
  }, [user, followedUsers, jerseysData, wardrobeData, listingsData]);

  return {
    data: recommendedJersey,
    isLoading: followsLoading || jerseysLoading,
  };
}

