import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

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
  };
  messages: {
    id: string;
    content: string;
    sender_id: string;
    read: boolean;
    created_at: string;
  }[];
  otherParticipant: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;

    try {
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
            created_at
          )
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get all unique participant IDs
      const participantIds = new Set<string>();
      data?.forEach((conv) => {
        const otherId = conv.participant_1_id === user.id 
          ? conv.participant_2_id 
          : conv.participant_1_id;
        participantIds.add(otherId);
      });

      // Fetch profiles for all participants
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", Array.from(participantIds));

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      // Combine data
      const conversationsWithProfiles = data?.map((conv) => {
        const otherId = conv.participant_1_id === user.id 
          ? conv.participant_2_id 
          : conv.participant_1_id;
        
        return {
          ...conv,
          otherParticipant: profilesMap.get(otherId) || {
            id: otherId,
            username: "Unknown",
            avatar_url: null,
          },
          messages: conv.messages.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        };
      }) || [];

      setConversations(conversationsWithProfiles);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to real-time updates
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
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen pb-20 lg:pb-8">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
      </header>

      {/* Conversations List */}
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages[0];
              const unreadCount = getUnreadCount(conversation);

              return (
                <div
                  key={conversation.id}
                  onClick={() => navigate(`/chat/${conversation.id}`)}
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
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {lastMessage.sender_id === user?.id && "You: "}
                          {lastMessage.content}
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

      <BottomNav />
    </div>
  );
};

export default Messages;