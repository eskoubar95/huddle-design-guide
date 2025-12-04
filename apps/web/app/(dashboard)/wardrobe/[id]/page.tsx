'use client'

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useJersey, useUpdateJersey, useDeleteJersey } from "@/lib/hooks/use-jerseys";
import { useProfile } from "@/lib/hooks/use-profiles";
import { useListings } from "@/lib/hooks/use-listings";
import { useAuctions } from "@/lib/hooks/use-auctions";
import { useJerseyLikes } from "@/lib/hooks/use-jersey-likes";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { CreateSaleListing } from "@/components/marketplace/CreateSaleListing";
import { CreateAuction } from "@/components/marketplace/CreateAuction";
import { PlaceBid } from "@/components/marketplace/PlaceBid";
import { JerseyImageGallery } from "@/components/jersey/JerseyImageGallery";
import { JerseyHeader } from "@/components/jersey/JerseyHeader";
import { JerseyOwnerInfo } from "@/components/jersey/JerseyOwnerInfo";
import { JerseyMetadata } from "@/components/jersey/JerseyMetadata";
import { JerseyMarketplaceInfo } from "@/components/jersey/JerseyMarketplaceInfo";
import { JerseyActions } from "@/components/jersey/JerseyActions";
import type { JerseyDTO } from "@/lib/services/jersey-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Owner {
  username: string;
  avatar_url?: string | null;
}

interface Listing {
  id: string;
  price: number;
  currency: string | null;
  negotiable: boolean | null;
  status: string;
}

interface Auction {
  id: string;
  current_bid?: number | null;
  starting_bid: number;
  buy_now_price?: number | null;
  currency: string | null;
  ends_at: string;
  status: string;
}

const JerseyDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const jerseyId = params.id || "";
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use custom hook for likes/saves
  const { isLiked, isSaved, likesCount, handleLike, handleSave } = useJerseyLikes(jerseyId);

  // Fetch jersey from API
  const {
    data: jersey,
    isLoading: jerseyLoading,
    error: jerseyError,
    refetch: refetchJersey,
  } = useJersey(jerseyId);

  // Fetch owner profile
  const { data: owner } = useProfile(jersey?.owner_id || "");
  
  const ownerData: Owner | null = owner
    ? {
        username: owner.username,
        avatar_url: owner.avatar_url,
      }
    : null;

  // Fetch sale listing (if exists)
  // Note: We need to find listing by jersey_id, which current API doesn't support directly
  // For now, we'll fetch all listings and filter client-side (not ideal, but works)
  const { data: allListings } = useListings({ status: "active", limit: 1000 });
  const listing = useMemo(() => {
    if (!allListings?.items || !jerseyId) return null;
    const found = allListings.items.find(
      (l) => l.jersey_id === jerseyId && l.currency !== null
    );
    return found ? (found as unknown as Listing) : null;
  }, [allListings, jerseyId]);

  // Fetch auction (if exists)
  const { data: allAuctions } = useAuctions({ status: "active", limit: 1000 });
  const auction = useMemo(() => {
    if (!allAuctions?.items || !jerseyId) return null;
    const found = allAuctions.items.find(
      (a) => a.jersey_id === jerseyId && a.currency !== null
    );
    return found ? (found as unknown as Auction) : null;
  }, [allAuctions, jerseyId]);

  const updateJerseyMutation = useUpdateJersey();
  const deleteJerseyMutation = useDeleteJersey();

  const isOwner = user?.id === jersey?.owner_id;
  const loading = jerseyLoading;


  // Handle jersey errors
  useEffect(() => {
    if (jerseyError) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        toast({
          title: "Error",
          description: "Failed to load jersey details",
          variant: "destructive",
        });
        router.push("/not-found");
      }, 0);
    }
  }, [jerseyError, toast, router]);

  // Polling for auction updates (replaces real-time subscriptions)
  useEffect(() => {
    if (!auction?.id) return;

    const interval = setInterval(() => {
      refetchJersey();
      // Refetch auctions to get updated bid
      // Note: This will trigger useMemo to recalculate auction
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [auction?.id, refetchJersey]);


  const handleToggleVisibility = async () => {
    if (!jersey) return;

    try {
      const newVisibility = jersey.visibility === "public" ? "private" : "public";
      await updateJerseyMutation.mutateAsync({
        id: jersey.id,
        data: { visibility: newVisibility },
      });

      toast({
        title: "Visibility Updated",
        description: `Jersey is now ${newVisibility}`,
      });
      refetchJersey(); // Refresh jersey data
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteJerseyMutation.mutateAsync(jerseyId);
      toast({
        title: "Jersey Deleted",
        description: "Your jersey has been deleted",
      });
      router.push("/wardrobe");
    } catch (error) {
      console.error("Error deleting jersey:", error);
      toast({
        title: "Error",
        description: "Failed to delete jersey",
        variant: "destructive",
      });
    }
  };

  const handleShowInterest = () => {
    toast({
      title: "Interest Sent",
      description: "The owner has been notified of your interest",
    });
  };

  // TODO: Conversations endpoints not implemented yet (HUD-17)
  // For now, keep conversations using direct Supabase calls
  const handleMessageSeller = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to message the seller",
        variant: "destructive",
      });
      return;
    }

    if (!jersey) return;

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      // Check if conversation already exists
      const { data: existingConversations, error: fetchError } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_1_id.eq.${user.id},participant_2_id.eq.${jersey.owner_id}),and(participant_1_id.eq.${jersey.owner_id},participant_2_id.eq.${user.id})`)
        .eq("jersey_id", jersey.id)
        .maybeSingle();

      // TODO: Update when database is ready (HUD-14)
      if (fetchError && fetchError.code !== "PGRST205") {
        throw fetchError;
      }

      if (existingConversations) {
        // Navigate to existing conversation
        router.push(`/messages/${existingConversations.id}`);
        return;
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          participant_1_id: user.id,
          participant_2_id: jersey.owner_id,
          jersey_id: jersey.id,
        })
        .select()
        .single();

      // TODO: Update when database is ready (HUD-14)
      if (createError && createError.code !== "PGRST205") {
        throw createError;
      }

      if (newConversation) {
        // Navigate to new conversation
        router.push(`/messages/${newConversation.id}`);
      } else {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading jersey...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!jersey) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-xl font-bold mb-2">Jersey Not Found</h2>
            <p className="text-muted-foreground mb-4">This jersey doesn&apos;t exist or is private</p>
            <Button onClick={() => router.push("/marketplace")}>Browse Marketplace</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          {/* Layout: Image Gallery Left, Content Right on laptop+ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Image Gallery */}
            <JerseyImageGallery
              images={jersey.imageVariants?.map((v) => v.optimizedUrl) || jersey.images || []}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
            />

            {/* Right: Content */}
            <div className="space-y-6">
            {/* Header */}
            <JerseyHeader
              club={jersey.metadata?.club?.name || jersey.club}
              season={jersey.metadata?.season?.label || jersey.season}
              jerseyType={jersey.jersey_type}
              visibility={jersey.visibility}
              likesCount={likesCount}
              hasListing={!!listing}
              hasAuction={!!auction}
              isOwner={isOwner}
              onToggleVisibility={handleToggleVisibility}
              onEdit={() => router.push(`/wardrobe/${jersey.id}/edit`)}
              onDelete={() => setShowDeleteDialog(true)}
            />

            {/* Owner Info */}
            <JerseyOwnerInfo
              owner={ownerData}
              isOwner={isOwner}
              isLiked={isLiked}
              isSaved={isSaved}
              onLike={handleLike}
              onSave={handleSave}
            />

            {/* Metadata */}
            <JerseyMetadata
              playerName={jersey.metadata?.player?.full_name || jersey.player_name}
              playerNumber={jersey.metadata?.player?.current_shirt_number?.toString() || jersey.player_number}
              competitionBadges={jersey.competition_badges}
              conditionRating={jersey.condition_rating}
              notes={jersey.notes}
            />

            {/* Marketplace Info */}
            <JerseyMarketplaceInfo
              listing={listing}
              auction={auction}
              isOwner={isOwner}
              onBuy={handleShowInterest}
              onBid={() => setShowBidModal(true)}
              onExpire={() => refetchJersey()}
            />

            {/* Actions */}
            <JerseyActions
              isOwner={isOwner}
              hasListing={!!listing}
              hasAuction={!!auction}
              onListForSale={() => setShowSaleModal(true)}
              onStartAuction={() => setShowAuctionModal(true)}
              onMessageSeller={handleMessageSeller}
              onShowInterest={handleShowInterest}
            />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSaleModal && jersey && (
        <CreateSaleListing
          jerseyId={jersey.id}
          isOpen={showSaleModal}
          onClose={() => {
            setShowSaleModal(false);
            refetchJersey();
          }}
        />
      )}

      {showAuctionModal && jersey && (
        <CreateAuction
          jerseyId={jersey.id}
          isOpen={showAuctionModal}
          onClose={() => {
            setShowAuctionModal(false);
            refetchJersey();
          }}
        />
      )}

      {showBidModal && auction && (
        <PlaceBid
          auctionId={auction.id}
          currentBid={auction.current_bid || undefined}
          startingBid={auction.starting_bid}
          isOpen={showBidModal}
          onClose={() => {
            setShowBidModal(false);
            refetchJersey();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Jersey?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your jersey from your
              collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ProtectedRoute>
  );
};

export default JerseyDetail;

