'use client'

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateSaleListing } from "@/components/marketplace/CreateSaleListing";
import { CreateAuction } from "@/components/marketplace/CreateAuction";
import { PlaceBid } from "@/components/marketplace/PlaceBid";
import { CountdownTimer } from "@/components/marketplace/CountdownTimer";
import {
  Heart,
  Bookmark,
  Share2,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ShoppingCart,
  Gavel,
  MessageSquare,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
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

interface Jersey {
  id: string;
  owner_id: string;
  club: string;
  season: string;
  jersey_type: string;
  player_name?: string | null;
  player_number?: string | null;
  competition_badges?: string[] | null;
  condition_rating?: number | null;
  notes?: string | null;
  visibility: string;
  images: string[];
  created_at: string;
}

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
  const { user } = useAuth();
  const jerseyId = params.id;
  
  const [jersey, setJersey] = useState<Jersey | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = user?.id === jersey?.owner_id;

  const fetchJerseyDetails = async () => {
    if (!jerseyId) return;

    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch jersey
      const { data: jerseyData, error: jerseyError } = await supabase
        .from("jerseys")
        .select("*")
        .eq("id", jerseyId)
        .single();

      // TODO: Update when database is ready (HUD-14)
      if (jerseyError) {
        if (jerseyError.code === "PGRST116") {
          // Jersey not found - redirect to 404
          router.push("/not-found");
          return;
        }
        if (jerseyError.code === "PGRST205") {
          console.warn("Jerseys table not found - redirecting to 404");
          router.push("/not-found");
          return;
        }
        throw jerseyError;
      }
      
      setJersey(jerseyData);

      // Fetch owner profile
      const { data: ownerData, error: ownerError } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", jerseyData.owner_id)
        .single();

      // TODO: Update when database is ready (HUD-14)
      if (ownerError && ownerError.code !== "PGRST205") {
        console.error("Error fetching owner:", ownerError);
      }
      setOwner(ownerData || null);

      // Fetch sale listing if exists
      const { data: saleData, error: saleError } = await supabase
        .from("sale_listings")
        .select("*")
        .eq("jersey_id", jerseyId)
        .eq("status", "active")
        .maybeSingle();

      // TODO: Update when database is ready (HUD-14)
      if (saleError && saleError.code !== "PGRST205") {
        console.error("Error fetching sale listing:", saleError);
      }
      // Only set listing if currency is not null (required for display)
      if (saleData && saleData.currency !== null) {
        setListing(saleData as Listing);
      } else {
        setListing(null);
      }

      // Fetch auction if exists
      const { data: auctionData, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("jersey_id", jerseyId)
        .eq("status", "active")
        .maybeSingle();

      // TODO: Update when database is ready (HUD-14)
      if (auctionError && auctionError.code !== "PGRST205") {
        console.error("Error fetching auction:", auctionError);
      }
      // Only set auction if currency is not null (required for display)
      if (auctionData && auctionData.currency !== null) {
        setAuction(auctionData as Auction);
      } else {
        setAuction(null);
      }

      // Fetch likes count
      const { count, error: likesError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("jersey_id", jerseyId);

      // TODO: Update when database is ready (HUD-14)
      if (likesError && likesError.code !== "PGRST205") {
        console.error("Error fetching likes count:", likesError);
      }
      setLikesCount(count || 0);

      if (user) {
        // Check if user liked
        const { data: likeData, error: likeCheckError } = await supabase
          .from("likes")
          .select("id")
          .eq("jersey_id", jerseyId)
          .eq("user_id", user.id)
          .maybeSingle();

        // TODO: Update when database is ready (HUD-14)
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

        // TODO: Update when database is ready (HUD-14)
        if (saveCheckError && saveCheckError.code !== "PGRST205") {
          console.error("Error checking save status:", saveCheckError);
        }
        setIsSaved(!!saveData);
      }
    } catch (error) {
      console.error("Error fetching jersey:", error);
      // Sentry error capture (if configured)
      // *Sentry.captureException(error, { tags: { page: "jersey-detail", jerseyId } });
      toast({
        title: "Error",
        description: "Failed to load jersey details",
        variant: "destructive",
      });
      router.push("/not-found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jerseyId) {
      fetchJerseyDetails();
    }
  }, [jerseyId]);

  // Real-time subscription for auction updates
  useEffect(() => {
    if (!jerseyId || !auction) return;

    const supabase = createClient();
    const auctionChannel = supabase
      .channel(`auction-${auction.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auction.id}`,
        },
        (payload) => {
          // Auction updated via real-time subscription
          fetchJerseyDetails();
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel(`bids-${auction.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auction.id}`,
        },
        (payload) => {
          // New bid placed via real-time subscription
          fetchJerseyDetails();
          toast({
            title: "New Bid!",
            description: `A new bid of €${(payload.new as { amount?: number }).amount || "N/A"} was placed`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [jerseyId, auction?.id, toast]);

  const handleLike = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }

    try {
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "Jersey link copied to clipboard",
    });
  };

  const handleToggleVisibility = async () => {
    if (!jersey) return;

    try {
      const supabase = createClient();
      const newVisibility = jersey.visibility === "public" ? "private" : "public";
      await supabase
        .from("jerseys")
        .update({ visibility: newVisibility })
        .eq("id", jersey.id);

      setJersey({ ...jersey, visibility: newVisibility });
      toast({
        title: "Visibility Updated",
        description: `Jersey is now ${newVisibility}`,
      });
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
      const supabase = createClient();
      await supabase.from("jerseys").delete().eq("id", jerseyId);
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
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Jersey Details</h1>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          {/* Image Gallery */}
          <div className="relative aspect-[3/4] bg-secondary">
            <img
              src={jersey.images[currentImageIndex] || "/placeholder.svg"}
              alt={`${jersey.club} ${jersey.season}`}
              className="w-full h-full object-contain"
            />

            {/* Navigation Arrows */}
            {jersey.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? jersey.images.length - 1 : prev - 1
                    )
                  }
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === jersey.images.length - 1 ? 0 : prev + 1
                    )
                  }
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Image Indicators */}
            {jersey.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {jersey.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? "bg-primary w-6"
                        : "bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-6">
            {/* Owner Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={owner?.avatar_url || undefined} />
                  <AvatarFallback>{owner?.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{owner?.username}</p>
                  <p className="text-sm text-muted-foreground">Owner</p>
                </div>
              </div>
              {!isOwner && (
                <div className="flex gap-2">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="icon"
                    onClick={handleLike}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    size="icon"
                    onClick={handleSave}
                  >
                    <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                  </Button>
                </div>
              )}
            </div>

            {/* Title & Status */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-bold">
                  {jersey.club} {jersey.season}
                </h2>
                {likesCount > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">{likesCount}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{jersey.jersey_type}</Badge>
                {jersey.visibility === "private" && (
                  <Badge variant="outline">
                    <EyeOff className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )}
                {listing && <Badge variant="default">For Sale</Badge>}
                {auction && <Badge variant="default">Auction Active</Badge>}
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              {jersey.player_name && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Player</p>
                  <p className="font-medium">
                    {jersey.player_name}
                    {jersey.player_number && ` #${jersey.player_number}`}
                  </p>
                </div>
              )}

              {jersey.competition_badges && jersey.competition_badges.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Competition Badges</p>
                  <div className="flex flex-wrap gap-2">
                    {jersey.competition_badges.map((badge, index) => (
                      <Badge key={index} variant="outline">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {jersey.condition_rating && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Condition</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${jersey.condition_rating * 10}%` }}
                      />
                    </div>
                    <span className="font-medium">{jersey.condition_rating}/10</span>
                  </div>
                </div>
              )}

              {jersey.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{jersey.notes}</p>
                </div>
              )}
            </div>

            {/* Listing/Auction Info */}
            {listing && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>
                <p className="text-2xl font-bold mb-2">
                  {listing.currency || "€"} {listing.price.toLocaleString()}
                  {listing.negotiable && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (Negotiable)
                    </span>
                  )}
                </p>
                {!isOwner && (
                  <Button className="w-full" onClick={handleShowInterest}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                )}
              </div>
            )}

            {auction && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Current Bid</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>
                <p className="text-2xl font-bold mb-2">
                  {auction.currency || "€"}{" "}
                  {(auction.current_bid || auction.starting_bid).toLocaleString()}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Ends in</span>
                  <CountdownTimer endsAt={auction.ends_at} onExpire={() => fetchJerseyDetails()} />
                </div>
                {!isOwner && (
                  <Button className="w-full" onClick={() => setShowBidModal(true)}>
                    <Gavel className="w-4 h-4 mr-2" />
                    Place Bid
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            {isOwner ? (
              <div className="space-y-2">
                {!listing && !auction && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowSaleModal(true)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      List for Sale
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAuctionModal(true)}
                    >
                      <Gavel className="w-4 h-4 mr-2" />
                      Start Auction
                    </Button>
                  </>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={handleToggleVisibility}>
                    {jersey.visibility === "public" ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  variant="default" 
                  className="w-full" 
                  onClick={handleMessageSeller}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message Seller
                </Button>
                {!listing && !auction && (
                  <Button variant="outline" className="w-full" onClick={handleShowInterest}>
                    Show Interest
                  </Button>
                )}
              </div>
            )}
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
            fetchJerseyDetails();
          }}
        />
      )}

      {showAuctionModal && jersey && (
        <CreateAuction
          jerseyId={jersey.id}
          isOpen={showAuctionModal}
          onClose={() => {
            setShowAuctionModal(false);
            fetchJerseyDetails();
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
            fetchJerseyDetails();
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

