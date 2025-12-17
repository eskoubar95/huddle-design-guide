"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiRequest } from "@/lib/api/client";
import type { SaleListingCreateInput } from "@/lib/validation/listing-schemas";
import type { Database } from "@/lib/supabase/types";

type SaleListing = Database["public"]["Tables"]["sale_listings"]["Row"];

interface ListingListResponse {
  items: SaleListing[];
  nextCursor: string | null;
}

export function useListings(params?: {
  status?: string;
  jerseyId?: string;
  club?: string;
  minPrice?: number;
  maxPrice?: number;
  country?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}) {
  const apiRequest = useApiRequest();

  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set("status", params.status);
  if (params?.jerseyId) queryParams.set("jerseyId", params.jerseyId);
  if (params?.club) queryParams.set("club", params.club);
  if (params?.minPrice) queryParams.set("minPrice", params.minPrice.toString());
  if (params?.maxPrice) queryParams.set("maxPrice", params.maxPrice.toString());
  if (params?.country) queryParams.set("country", params.country);
  if (params?.sort) queryParams.set("sort", params.sort);
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.cursor) queryParams.set("cursor", params.cursor);

  return useQuery({
    queryKey: ["listings", params],
    queryFn: () =>
      apiRequest<ListingListResponse>(
        `/listings${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      ),
    enabled: true,
  });
}

export function useListing(id: string) {
  const apiRequest = useApiRequest();

  return useQuery({
    queryKey: ["listing", id],
    queryFn: () => apiRequest<SaleListing>(`/listings/${id}`),
    enabled: !!id,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (data: SaleListingCreateInput) =>
      apiRequest<SaleListing>("/listings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SaleListingCreateInput>;
    }) =>
      apiRequest<SaleListing>(`/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing", variables.id] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/listings/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

