import { BidRepository } from "@/lib/repositories/bid-repository";
import { AuctionRepository } from "@/lib/repositories/auction-repository";
import { ApiError } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";
import type { BidCreateInput } from "@/lib/validation/auction-schemas";

/**
 * Service for bid business logic
 * Handles bid validation and atomic transaction handling via RPC function
 */
export class BidService {
  private bidRepository = new BidRepository();
  private auctionRepository = new AuctionRepository();

  async placeBid(auctionId: string, input: BidCreateInput, bidderId: string) {
    const auction = await this.auctionRepository.findById(auctionId);

    if (!auction || auction.status !== "active") {
      throw new ApiError("BAD_REQUEST", "Auction is not active", 400);
    }

    // Check if auction has ended
    if (auction.ends_at && new Date(auction.ends_at) < new Date()) {
      throw new ApiError("BAD_REQUEST", "Auction has ended", 400);
    }

    const amountNum = parseFloat(input.amount);
    const currentBid = parseFloat(
      (auction.current_bid || auction.starting_bid).toString()
    );
    // Note: minBid is computed but not currently used - kept for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _minBid = currentBid + 0.01; // Minimum increment

    if (amountNum <= currentBid) {
      throw new ApiError(
        "BAD_REQUEST",
        `Bid must be higher than ${currentBid}`,
        400
      );
    }

    // Check if user is bidding on their own auction
    if (auction.seller_id === bidderId) {
      throw new ApiError("BAD_REQUEST", "Cannot bid on your own auction", 400);
    }

    // Use Supabase RPC function for atomic transaction
    // This ensures both bid creation and auction.current_bid update happen atomically
    // Note: place_bid RPC function is defined in migration but not yet in generated types
    const supabase = await createServiceClient();
    const { data, error } = await (supabase.rpc as unknown as {
      (name: string, args: Record<string, unknown>): Promise<{
        data: unknown;
        error: { code?: string; message: string } | null;
      }>;
    })("place_bid", {
      p_auction_id: auctionId,
      p_bidder_id: bidderId,
      p_amount: input.amount,
    });

    if (error) {
      // Handle specific errors from RPC
      if (error.code === "P0001") {
        throw new ApiError("BAD_REQUEST", error.message, 400);
      }
      throw new ApiError("INTERNAL_SERVER_ERROR", "Failed to place bid", 500);
    }

    return data;
  }

  async getBidsForAuction(auctionId: string, limit: number = 20) {
    return await this.bidRepository.findByAuctionId(auctionId, limit);
  }
}

