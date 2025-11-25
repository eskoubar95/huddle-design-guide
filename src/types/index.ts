export interface Jersey {
  id: string;
  images: string[];
  club: string;
  season: string;
  type: JerseyType;
  player?: {
    name: string;
    number: number;
  };
  badges: Badge[];
  condition: number;
  notes?: string;
  visibility: "public" | "private";
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerCountry?: string;
  likes: number;
  saves: number;
  isLiked?: boolean;
  isSaved?: boolean;
  forSale?: boolean;
  price?: string;
  isAuction?: boolean;
  currentBid?: string;
  auctionEndTime?: Date;
  createdAt: Date;
}

export type JerseyType =
  | "Home"
  | "Away"
  | "Third"
  | "Fourth"
  | "Special Edition"
  | "GK Home"
  | "GK Away"
  | "GK Third";

export type Badge =
  | "Champions League"
  | "Premier League"
  | "Serie A"
  | "La Liga"
  | "Bundesliga"
  | "FIFA Club WC"
  | "Other";

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userCountry?: string;
  content: string;
  jersey?: Jersey;
  likes: number;
  comments: number;
  isLiked?: boolean;
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  jerseyId?: string;
  jerseyImage?: string;
  timestamp: Date;
  read: boolean;
}

export type NotificationType =
  | "follow"
  | "like"
  | "save"
  | "outbid"
  | "bid"
  | "auction_won"
  | "interest"
  | "sold"
  | "auction_ended";

export interface User {
  id: string;
  username: string;
  avatar?: string;
  country?: string;
  bio?: string;
  followers: number;
  following: number;
  isFollowing?: boolean;
  isVerified?: boolean;
}
