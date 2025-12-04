"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useApiRequest } from "@/lib/api/client";
import type { JerseyCreateInput, JerseyUpdateInput } from "@/lib/validation/jersey-schemas";
import type { JerseyDTO } from "@/lib/services/jersey-service";

interface JerseyListResponse {
  items: JerseyDTO[];
  nextCursor: string | null;
}

export function useJerseys(params?: {
  ownerId?: string;
  visibility?: string;
  club?: string;
  season?: string;
  limit?: number;
  cursor?: string;
}) {
  const { isLoaded } = useAuth();
  const apiRequest = useApiRequest();

  const queryParams = new URLSearchParams();
  if (params?.ownerId) queryParams.set("ownerId", params.ownerId);
  if (params?.visibility) queryParams.set("visibility", params.visibility);
  if (params?.club) queryParams.set("club", params.club);
  if (params?.season) queryParams.set("season", params.season);
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.cursor) queryParams.set("cursor", params.cursor);

  // If ownerId is set, we need auth to be loaded (for authorization check)
  // If no ownerId, we can query public jerseys without auth
  const needsAuth = !!params?.ownerId;
  const enabled = needsAuth ? isLoaded : true;

  return useQuery({
    queryKey: ["jerseys", params],
    queryFn: () =>
      apiRequest<JerseyListResponse>(
        `/jerseys${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      ),
    enabled,
  });
}

export function useJersey(id: string) {
  const apiRequest = useApiRequest();

  return useQuery({
    queryKey: ["jersey", id],
    queryFn: () => apiRequest<JerseyDTO>(`/jerseys/${id}`),
    enabled: !!id,
  });
}

export function useCreateJersey() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (data: JerseyCreateInput) =>
      apiRequest<JerseyDTO>("/jerseys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jerseys"] });
    },
  });
}

export function useUpdateJersey() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JerseyUpdateInput }) =>
      apiRequest<JerseyDTO>(`/jerseys/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["jerseys"] });
      queryClient.invalidateQueries({ queryKey: ["jersey", variables.id] });
    },
  });
}

export function useDeleteJersey() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/jerseys/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jerseys"] });
    },
  });
}

