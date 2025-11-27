"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiRequest } from "@/lib/api/client";
import type { AuctionCreateInput } from "@/lib/validation/auction-schemas";
import type { Database } from "@/lib/supabase/types";

type Auction = Database["public"]["Tables"]["auctions"]["Row"];

interface AuctionListResponse {
  items: Auction[];
  nextCursor: string | null;
}

export function useAuctions(params?: {
  status?: string;
  sellerId?: string;
  limit?: number;
  cursor?: string;
}) {
  const apiRequest = useApiRequest();

  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set("status", params.status);
  if (params?.sellerId) queryParams.set("sellerId", params.sellerId);
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.cursor) queryParams.set("cursor", params.cursor);

  return useQuery({
    queryKey: ["auctions", params],
    queryFn: () =>
      apiRequest<AuctionListResponse>(
        `/auctions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      ),
    enabled: true,
  });
}

export function useAuction(id: string) {
  const apiRequest = useApiRequest();

  return useQuery({
    queryKey: ["auction", id],
    queryFn: () => apiRequest<Auction>(`/auctions/${id}`),
    enabled: !!id,
  });
}

export function useCreateAuction() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (data: AuctionCreateInput) =>
      apiRequest<Auction>("/auctions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

