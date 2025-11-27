"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiRequest } from "@/lib/api/client";
import type { PostCreateInput } from "@/lib/validation/post-schemas";
import type { Database } from "@/lib/supabase/types";

type Post = Database["public"]["Tables"]["posts"]["Row"];

interface PostListResponse {
  items: Post[];
  nextCursor: string | null;
}

export function usePosts(params?: {
  userId?: string;
  jerseyId?: string;
  limit?: number;
  cursor?: string;
}) {
  const apiRequest = useApiRequest();

  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.set("userId", params.userId);
  if (params?.jerseyId) queryParams.set("jerseyId", params.jerseyId);
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.cursor) queryParams.set("cursor", params.cursor);

  return useQuery({
    queryKey: ["posts", params],
    queryFn: () =>
      apiRequest<PostListResponse>(
        `/posts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      ),
    enabled: true,
  });
}

export function usePost(id: string) {
  const apiRequest = useApiRequest();

  return useQuery({
    queryKey: ["post", id],
    queryFn: () => apiRequest<Post>(`/posts/${id}`),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (data: PostCreateInput) =>
      apiRequest<Post>("/posts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PostCreateInput> }) =>
      apiRequest<Post>(`/posts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.id] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/posts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

