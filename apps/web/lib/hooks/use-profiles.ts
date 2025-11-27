"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiRequest } from "@/lib/api/client";
import type { ProfileUpdateInput } from "@/lib/validation/profile-schemas";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function useProfile(id: string) {
  const apiRequest = useApiRequest();

  return useQuery({
    queryKey: ["profile", id],
    queryFn: () => apiRequest<Profile>(`/profiles/${id}`),
    enabled: !!id,
  });
}

export function useProfileByUsername(username: string) {
  const apiRequest = useApiRequest();

  return useQuery({
    queryKey: ["profile", "username", username],
    queryFn: () => apiRequest<Profile>(`/profiles/username/${username}`),
    enabled: !!username,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProfileUpdateInput }) =>
      apiRequest<Profile>(`/profiles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profile", variables.id] });
    },
  });
}

