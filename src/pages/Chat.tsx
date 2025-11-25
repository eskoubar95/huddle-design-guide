import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, User, Loader2, Check, CheckCheck, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  images?: string[];
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
  };
  otherParticipant: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const Chat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversation = async () => {
    if (!conversationId || !user) return;

    try {
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

      if (error) throw error;

      // Get other participant
      const otherId = data.participant_1_id === user.id 
        ? data.participant_2_id 
        : data.participant_1_id;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", otherId)
        .single();

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
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

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
    if (!conversationId || !user || !conversation) return;

    const loadChat = async () => {
      await Promise.all([fetchConversation(), fetchMessages()]);
    };

    loadChat();

    // Subscribe to real-time messages
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

    // Subscribe to presence for typing indicators
    const presenceChannel = supabase
      .channel(`typing-${conversationId}`, {
        config: { presence: { key: user.id } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const otherUserId = conversation.otherParticipant.id;
        const otherUserPresence = state[otherUserId];
        
        if (otherUserPresence && otherUserPresence.length > 0) {
          const presenceData = otherUserPresence[0] as any;
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
    };
  }, [conversationId, user, conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateTypingStatus = async (typing: boolean) => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    await channel.track({ typing, user_id: user.id });
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

    for (const file of selectedImages) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

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
      // Upload images first
      const imageUrls = await uploadImages();

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: newMessage.trim() || "",
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });

      if (error) throw error;

      setNewMessage("");
      setSelectedImages([]);
      setImagePreviewUrls([]);

      // Create notification for the other participant
      if (conversation) {
        const notificationMessage = imageUrls.length > 0
          ? `Sent ${imageUrls.length} image${imageUrls.length > 1 ? "s" : ""}${newMessage.trim() ? `: ${newMessage.trim().substring(0, 30)}...` : ""}`
          : newMessage.trim().substring(0, 50) + (newMessage.length > 50 ? "..." : "");

        await supabase.from("notifications").insert({
          user_id: conversation.otherParticipant.id,
          type: "message",
          title: "New Message",
          message: notificationMessage,
        });
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
      <div className="min-h-screen pb-20 lg:pb-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen pb-20 lg:pb-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Conversation not found</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-8 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/messages")}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => navigate(`/user/${conversation.otherParticipant.id}`)}
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
                onClick={() => navigate(`/jersey/${conversation.jerseys!.id}`)}
                className="w-10 h-14 rounded object-cover cursor-pointer"
              />
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;

            return (
              <div
                key={message.id}
                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
              >
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
              </div>
            );
          })}
          
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

      <BottomNav />
    </div>
  );
};

export default Chat;