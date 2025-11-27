"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiRequest } from "@/lib/api/client";
import type { BidCreateInput } from "@/lib/validation/auction-schemas";
import type { Database } from "@/lib/supabase/types";

type Bid = Database["public"]["Tables"]["bids"]["Row"];

export function usePlaceBid() {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation({
    mutationFn: (data: BidCreateInput) =>
      apiRequest<Bid>("/bids", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      // Invalidate auction queries to refresh current bid
      queryClient.invalidateQueries({ queryKey: ["auction", variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

