'use client'

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, MessageSquare, Search, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  jersey_id: string | null;
  updated_at: string;
  jerseys?: {
    club: string;
    season: string;
    images: string[];
  } | null;
  messages: {
    id: string;
    content: string | null;
    sender_id: string;
    read: boolean;
    created_at: string;
    images?: string[] | null;
  }[];
  otherParticipant: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const Messages = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          participant_1_id,
          participant_2_id,
          jersey_id,
          updated_at,
          jerseys (
            club,
            season,
            images
          ),
          messages (
            id,
            content,
            sender_id,
            read,
            created_at,
            images
          )
        `)
        .or(`participant_1_id.eq.${user?.id},participant_2_id.eq.${user?.id}`)
        .order("updated_at", { ascending: false });

      // TODO: Update when database is ready (HUD-14)
      // Handle database table not found gracefully
      if (error) {
        if (error.code === "PGRST205") {
          console.warn("Conversations table not found - using empty state");
          setConversations([]);
          setFilteredConversations([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Get all unique participant IDs
      const participantIds = new Set<string>();
      data?.forEach((conv) => {
        const otherId = conv.participant_1_id === user?.id 
          ? conv.participant_2_id 
          : conv.participant_1_id;
        participantIds.add(otherId);
      });

      // Fetch profiles for all participants
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", Array.from(participantIds));

      // TODO: Update when database is ready (HUD-14)
      if (profilesError && profilesError.code !== "PGRST205") {
        console.error("Error fetching profiles:", profilesError);
      }

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      // Combine data
      const conversationsWithProfiles = data?.map((conv) => {
        const otherId = conv.participant_1_id === user?.id 
          ? conv.participant_2_id 
          : conv.participant_1_id;
        
        return {
          ...conv,
          otherParticipant: profilesMap.get(otherId) || {
            id: otherId,
            username: "Unknown",
            avatar_url: null,
          },
          messages: (conv.messages || []).sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        };
      }) || [];

      setConversations(conversationsWithProfiles);
      setFilteredConversations(conversationsWithProfiles);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      // Sentry error capture (if configured)
      // *Sentry.captureException(error, { tags: { page: "messages" } });
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
      setConversations([]);
      setFilteredConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = conversations.filter((conv) => {
      // Search by username
      const usernameMatch = conv.otherParticipant.username
        .toLowerCase()
        .includes(query);

      // Search by message content
      const messageMatch = conv.messages.some((msg) =>
        msg.content?.toLowerCase().includes(query)
      );

      // Search by jersey details
      const jerseyMatch = conv.jerseys
        ? conv.jerseys.club.toLowerCase().includes(query) ||
          conv.jerseys.season.toLowerCase().includes(query)
        : false;

      return usernameMatch || messageMatch || jerseyMatch;
    });

    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getUnreadCount = (conv: Conversation) => {
    return conv.messages.filter((m) => !m.read && m.sender_id !== user?.id).length;
  };

  const handleConversationClick = (conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
            <h1 className="text-2xl font-bold mb-4">Messages</h1>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations, messages, jerseys..."
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Conversations List */}
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try a different search term
                  </p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations yet. Start a conversation!</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => {
                const lastMessage = conversation.messages[0];
                const unreadCount = getUnreadCount(conversation);

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation.id)}
                    className={cn(
                      "bg-card rounded-lg border border-border p-4 cursor-pointer transition-colors hover:bg-card-hover",
                      unreadCount > 0 && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                        {conversation.otherParticipant.avatar_url ? (
                          <img
                            src={conversation.otherParticipant.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">
                              {conversation.otherParticipant.username}
                            </div>
                            {conversation.jerseys && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {conversation.jerseys.club} • {conversation.jerseys.season}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {lastMessage && getTimeAgo(lastMessage.created_at)}
                            </span>
                            {unreadCount > 0 && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-xs text-primary-foreground font-bold">
                                  {unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {lastMessage && (
                          <p className="text-sm text-muted-foreground mt-1 truncate flex items-center gap-1">
                            {lastMessage.sender_id === user?.id && "You: "}
                            {lastMessage.images && lastMessage.images.length > 0 && (
                              <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            {lastMessage.content || (lastMessage.images?.length ? `${lastMessage.images.length} image${lastMessage.images.length > 1 ? "s" : ""}` : "")}
                          </p>
                        )}
                      </div>

                      {/* Jersey thumbnail */}
                      {conversation.jerseys && (
                        <img
                          src={conversation.jerseys.images[0]}
                          alt=""
                          className="w-12 h-16 rounded object-cover flex-shrink-0"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Messages;

