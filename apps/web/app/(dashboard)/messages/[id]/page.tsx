'use client'

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, User, Loader2, Check, CheckCheck, Image as ImageIcon, X, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  count?: number;
  users?: string[];
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  images?: string[] | null;
  reactions?: Reaction[];
}

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  jersey_id: string | null;
  jerseys?: {
    id: string;
    club: string;
    season: string;
    images: string[];
  } | null;
  otherParticipant: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const Chat = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const conversationId = params.id;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, Reaction[]>>({});

  const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversation = async () => {
    if (!conversationId || !user) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          participant_1_id,
          participant_2_id,
          jersey_id,
          jerseys (
            id,
            club,
            season,
            images
          )
        `)
        .eq("id", conversationId)
        .single();

      // TODO: Update when database is ready (HUD-14)
      if (error) {
        if (error.code === "PGRST116") {
          // Conversation not found - redirect to messages list
          router.push("/messages");
          return;
        }
        if (error.code === "PGRST205") {
          console.warn("Conversations table not found - redirecting to messages list");
          router.push("/messages");
          return;
        }
        throw error;
      }

      // Get other participant
      const otherId = data.participant_1_id === user?.id 
        ? data.participant_2_id 
        : data.participant_1_id;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", otherId)
        .single();

      // TODO: Update when database is ready (HUD-14)
      if (profileError && profileError.code !== "PGRST205") {
        console.error("Error fetching profile:", profileError);
      }

      setConversation({
        ...data,
        otherParticipant: profileData || {
          id: otherId,
          username: "Unknown",
          avatar_url: null,
        },
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      // Sentry error capture (if configured)
      // *Sentry.captureException(error, { tags: { page: "chat", conversationId } });
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
      router.push("/messages");
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      // TODO: Update when database is ready (HUD-14)
      if (error) {
        if (error.code === "PGRST205") {
          console.warn("Messages table not found - using empty state");
          setMessages([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      
      setMessages(data || []);

      // Fetch reactions for all messages
      if (data && data.length > 0) {
        const { data: reactionsData, error: reactionsError } = await supabase
          .from("message_reactions")
          .select("*")
          .in("message_id", data.map(m => m.id));

        // TODO: Update when database is ready (HUD-14)
        if (reactionsError && reactionsError.code !== "PGRST205") {
          console.error("Error fetching reactions:", reactionsError);
        }

        if (reactionsData) {
          const reactionsByMessage: Record<string, Reaction[]> = {};
          reactionsData.forEach(reaction => {
            if (!reactionsByMessage[reaction.message_id]) {
              reactionsByMessage[reaction.message_id] = [];
            }
            reactionsByMessage[reaction.message_id].push({
              id: reaction.id,
              emoji: reaction.emoji,
              user_id: reaction.user_id,
            });
          });
          
          // Group reactions by emoji
          Object.keys(reactionsByMessage).forEach(messageId => {
            const grouped: Record<string, Reaction> = {};
            reactionsByMessage[messageId].forEach(reaction => {
              if (!grouped[reaction.emoji]) {
                grouped[reaction.emoji] = {
                  id: reaction.id,
                  emoji: reaction.emoji,
                  user_id: reaction.user_id,
                  count: 0,
                  users: [],
                };
              }
              grouped[reaction.emoji].count! += 1;
              grouped[reaction.emoji].users!.push(reaction.user_id);
            });
            reactionsByMessage[messageId] = Object.values(grouped);
          });

          setMessageReactions(reactionsByMessage);
        }
      }

      // Mark messages as read
      const unreadMessages = data?.filter(
        (m) => !m.read && m.sender_id !== user?.id
      );

      if (unreadMessages && unreadMessages.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in(
            "id",
            unreadMessages.map((m) => m.id)
          );
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversationId || !user) return;

    const loadChat = async () => {
      await Promise.all([fetchConversation(), fetchMessages()]);
    };

    loadChat();
  }, [conversationId, user, fetchConversation, fetchMessages]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId || !user || !conversation) return;

    const supabase = createClient();
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          
          // Mark as read if not from current user
          if (payload.new.sender_id !== user?.id) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", payload.new.id)
              .then(() => {});
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Update read status in real-time
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          );
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          // Refetch reactions when they change
          fetchMessages();
        }
      )
      .subscribe();

    // Subscribe to presence for typing indicators
    const presenceChannel = supabase
      .channel(`typing-${conversationId}`, {
        config: { presence: { key: user?.id || "" } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const otherUserId = conversation.otherParticipant.id;
        const otherUserPresence = state[otherUserId];
        
        if (otherUserPresence && otherUserPresence.length > 0) {
          const presenceData = otherUserPresence[0] as { typing?: boolean };
          const isTyping = presenceData.typing === true;
          setOtherUserTyping(isTyping);
        } else {
          setOtherUserTyping(false);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [conversationId, user, conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const supabase = createClient();
      // Check if user already reacted with this emoji
      const existingReaction = messageReactions[messageId]?.find(
        r => r.emoji === emoji && r.users?.includes(user?.id || "")
      );

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user?.id || "")
          .eq("emoji", emoji);
      } else {
        // Add reaction
        await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: user?.id || "",
            emoji,
          });
      }
    } catch (error) {
      console.error("Error handling reaction:", error);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    }
  };

  const updateTypingStatus = async (typing: boolean) => {
    if (!conversationId || !user) return;

    const supabase = createClient();
    const channel = supabase.channel(`typing-${conversationId}`);
    await channel.track({ typing, user_id: user?.id || "" });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images per message
    const maxImages = 5;
    const limitedFiles = files.slice(0, maxImages - selectedImages.length);

    setSelectedImages((prev) => [...prev, ...limitedFiles]);

    // Create preview URLs
    limitedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0 || !user) return [];

    const uploadedUrls: string[] = [];
    const supabase = createClient();

    for (const file of selectedImages) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id || "unknown"}/${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat_images")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        continue;
      }

      const { data } = supabase.storage
        .from("chat_images")
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);

    if (!value.trim()) {
      updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      return;
    }

    // Start typing
    updateTypingStatus(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && selectedImages.length === 0) || !user || !conversationId) return;

    // Clear typing status
    updateTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSending(true);
    try {
      const supabase = createClient();
      // Upload images first
      const imageUrls = await uploadImages();

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user?.id || "",
        content: newMessage.trim() || "",
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });

      // TODO: Update when database is ready (HUD-14)
      if (error && error.code !== "PGRST205") {
        throw error;
      }

      setNewMessage("");
      setSelectedImages([]);
      setImagePreviewUrls([]);

      // Create notification for the other participant
      if (conversation) {
        const notificationMessage = imageUrls.length > 0
          ? `Sent ${imageUrls.length} image${imageUrls.length > 1 ? "s" : ""}${newMessage.trim() ? `: ${newMessage.trim().substring(0, 30)}...` : ""}`
          : newMessage.trim().substring(0, 50) + (newMessage.length > 50 ? "..." : "");

        // TODO: Update when database is ready (HUD-14)
        try {
          await supabase.from("notifications").insert({
            user_id: conversation.otherParticipant.id,
            type: "message",
            title: "New Message",
            message: notificationMessage,
          });
        } catch (notifError) {
          // Silently fail if notifications table doesn't exist
          const error = notifError as { code?: string };
          if (error.code !== "PGRST205") {
            console.error("Error creating notification:", notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getTimeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!conversation) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Conversation not found</p>
            <Button onClick={() => router.push("/messages")} className="mt-4">
              Back to Messages
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/messages")}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => router.push(`/profile/${conversation.otherParticipant.username}`)}
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {conversation.otherParticipant.avatar_url ? (
                    <img
                      src={conversation.otherParticipant.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{conversation.otherParticipant.username}</div>
                  {conversation.jerseys && (
                    <div className="text-xs text-muted-foreground">
                      {conversation.jerseys.club} • {conversation.jerseys.season}
                    </div>
                  )}
                </div>
              </div>

              {conversation.jerseys && (
                <img
                  src={conversation.jerseys.images[0]}
                  alt=""
                  onClick={() => router.push(`/wardrobe/${conversation.jerseys!.id}`)}
                  className="w-10 h-14 rounded object-cover cursor-pointer"
                />
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4 space-y-4">
            {messages.length === 0 && !loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === user?.id;

                return (
                  <div
                    key={message.id}
                    className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                  >
                    <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary"
                        )}
                      >
                        {message.images && message.images.length > 0 && (
                          <div className={cn(
                            "grid gap-2 mb-2",
                            message.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                          )}>
                            {message.images.map((imageUrl, idx) => (
                              <img
                                key={idx}
                                src={imageUrl}
                                alt=""
                                className="rounded max-h-60 w-full object-cover cursor-pointer"
                                onClick={() => window.open(imageUrl, "_blank")}
                              />
                            ))}
                          </div>
                        )}
                        {message.content && <p className="text-sm">{message.content}</p>}
                        <div
                          className={cn(
                            "flex items-center gap-1 text-xs mt-1",
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          <span>{getTimeDisplay(message.created_at)}</span>
                          {isOwn && (
                            <span className="flex-shrink-0">
                              {message.read ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-1 mt-1">
                        {messageReactions[message.id] && messageReactions[message.id].length > 0 && (
                          <div className="flex gap-1">
                            {messageReactions[message.id].map((reaction) => (
                              <button
                                key={reaction.emoji}
                                onClick={() => handleReaction(message.id, reaction.emoji)}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary hover:bg-secondary/80 transition-colors border",
                                  reaction.users?.includes(user?.id || "") && "border-primary"
                                )}
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-muted-foreground">{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Add Reaction Button */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-secondary transition-colors">
                              <Smile className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align={isOwn ? "end" : "start"}>
                            <div className="flex gap-2">
                              {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className="text-2xl hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Typing Indicator */}
            {otherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-background border-t border-border">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {imagePreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-20 rounded object-cover border border-border"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || selectedImages.length >= 5}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={sending || (!newMessage.trim() && selectedImages.length === 0)}>
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Chat;

