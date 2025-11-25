import { BottomNav } from "@/components/BottomNav";
import { Heart, UserPlus, MessageSquare, Gavel, DollarSign, Eye, Trophy } from "lucide-react";
import { Notification } from "@/types";
import { cn } from "@/lib/utils";

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "follow",
    title: "New Follower",
    message: "JerseyCollector23 started following you",
    userName: "JerseyCollector23",
    timestamp: new Date(Date.now() - 3600000),
    read: false,
  },
  {
    id: "2",
    type: "like",
    title: "New Like",
    message: "FootballKits liked your Barcelona 23/24 Home jersey",
    userName: "FootballKits",
    jerseyImage: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=600&fit=crop",
    timestamp: new Date(Date.now() - 7200000),
    read: false,
  },
  {
    id: "3",
    type: "bid",
    title: "New Bid",
    message: "New bid of €350 on your Real Madrid 22/23 Away",
    userName: "KitMaster",
    jerseyImage: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop",
    timestamp: new Date(Date.now() - 10800000),
    read: false,
  },
  {
    id: "4",
    type: "interest",
    title: "Interest in Your Jersey",
    message: "Someone is interested in your Manchester United 21/22 Third",
    userName: "RedDevil99",
    timestamp: new Date(Date.now() - 86400000),
    read: true,
  },
  {
    id: "5",
    type: "auction_won",
    title: "Auction Won!",
    message: "Congratulations! You won the Bayern Munich 23/24 Home",
    jerseyImage: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=600&fit=crop",
    timestamp: new Date(Date.now() - 172800000),
    read: true,
  },
];

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "follow":
      return <UserPlus className="w-5 h-5" />;
    case "like":
      return <Heart className="w-5 h-5" />;
    case "save":
      return <Eye className="w-5 h-5" />;
    case "bid":
    case "outbid":
      return <Gavel className="w-5 h-5" />;
    case "sold":
      return <DollarSign className="w-5 h-5" />;
    case "interest":
      return <MessageSquare className="w-5 h-5" />;
    case "auction_won":
    case "auction_ended":
      return <Trophy className="w-5 h-5" />;
    default:
      return <MessageSquare className="w-5 h-5" />;
  }
};

const getTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const Notifications = () => {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="text-sm text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications List */}
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
        <div className="space-y-2">
          {mockNotifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "p-4 rounded-lg border transition-colors cursor-pointer",
                notification.read
                  ? "bg-card border-border hover:border-muted"
                  : "bg-secondary/50 border-primary/20 hover:border-primary/40"
              )}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    notification.read ? "bg-secondary" : "bg-primary/10 text-primary"
                  )}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                    {notification.jerseyImage && (
                      <img
                        src={notification.jerseyImage}
                        alt=""
                        className="w-12 h-16 rounded object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {getTimeAgo(notification.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
