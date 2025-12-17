export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      auctions: {
        Row: {
          buy_now_price: number | null
          created_at: string | null
          currency: string | null
          current_bid: number | null
          duration_hours: number
          ended_at: string | null
          ends_at: string
          id: string
          jersey_id: string
          seller_id: string
          shipping_cost_buyer: boolean | null
          shipping_cost_seller: boolean | null
          shipping_free_in_country: boolean | null
          shipping_local_only: boolean | null
          shipping_worldwide: boolean | null
          starting_bid: number
          status: string | null
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          buy_now_price?: number | null
          created_at?: string | null
          currency?: string | null
          current_bid?: number | null
          duration_hours: number
          ended_at?: string | null
          ends_at: string
          id?: string
          jersey_id: string
          seller_id: string
          shipping_cost_buyer?: boolean | null
          shipping_cost_seller?: boolean | null
          shipping_free_in_country?: boolean | null
          shipping_local_only?: boolean | null
          shipping_worldwide?: boolean | null
          starting_bid: number
          status?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          buy_now_price?: number | null
          created_at?: string | null
          currency?: string | null
          current_bid?: number | null
          duration_hours?: number
          ended_at?: string | null
          ends_at?: string
          id?: string
          jersey_id?: string
          seller_id?: string
          shipping_cost_buyer?: boolean | null
          shipping_cost_seller?: boolean | null
          shipping_free_in_country?: boolean | null
          shipping_local_only?: boolean | null
          shipping_worldwide?: boolean | null
          starting_bid?: number
          status?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_jobs: {
        Row: {
          club_ids: string[] | null
          competition_id: string | null
          competition_name: string | null
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          mode: string
          priority: number
          progress: Json | null
          selected_seasons: string[]
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          club_ids?: string[] | null
          competition_id?: string | null
          competition_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          mode: string
          priority?: number
          progress?: Json | null
          selected_seasons: string[]
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          club_ids?: string[] | null
          competition_id?: string | null
          competition_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          mode?: string
          priority?: number
          progress?: Json | null
          selected_seasons?: string[]
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          jersey_id: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_id?: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_id?: string | null
          participant_1_id?: string
          participant_2_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      identity_verification_review_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
          verification_session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_session_id?: string | null
        }
        Relationships: []
      }
      jersey_images: {
        Row: {
          created_at: string | null
          id: string
          image_embedding: string | null
          image_url: string
          image_url_webp: string | null
          jersey_id: string
          sort_order: number | null
          storage_path: string
          updated_at: string | null
          view_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_embedding?: string | null
          image_url: string
          image_url_webp?: string | null
          jersey_id: string
          sort_order?: number | null
          storage_path: string
          updated_at?: string | null
          view_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_embedding?: string | null
          image_url?: string
          image_url_webp?: string | null
          jersey_id?: string
          sort_order?: number | null
          storage_path?: string
          updated_at?: string | null
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jersey_images_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      jerseys: {
        Row: {
          club: string
          club_id: string | null
          competition_badges: string[] | null
          condition_rating: number | null
          created_at: string
          id: string
          images: string[]
          jersey_type: string
          notes: string | null
          owner_id: string
          player_id: string | null
          player_name: string | null
          player_number: string | null
          season: string
          season_id: string | null
          status: string | null
          updated_at: string
          visibility: string
          vision_confidence: number | null
          vision_raw: Json | null
        }
        Insert: {
          club: string
          club_id?: string | null
          competition_badges?: string[] | null
          condition_rating?: number | null
          created_at?: string
          id?: string
          images: string[]
          jersey_type: string
          notes?: string | null
          owner_id: string
          player_id?: string | null
          player_name?: string | null
          player_number?: string | null
          season: string
          season_id?: string | null
          status?: string | null
          updated_at?: string
          visibility?: string
          vision_confidence?: number | null
          vision_raw?: Json | null
        }
        Update: {
          club?: string
          club_id?: string | null
          competition_badges?: string[] | null
          condition_rating?: number | null
          created_at?: string
          id?: string
          images?: string[]
          jersey_type?: string
          notes?: string | null
          owner_id?: string
          player_id?: string | null
          player_name?: string | null
          player_number?: string | null
          season?: string
          season_id?: string | null
          status?: string | null
          updated_at?: string
          visibility?: string
          vision_confidence?: number | null
          vision_raw?: Json | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          jersey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          images: string[] | null
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          images?: string[] | null
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          images?: string[] | null
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_auction_id: string | null
          related_jersey_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_auction_id?: string | null
          related_jersey_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_auction_id?: string | null
          related_jersey_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_auction_id_fkey"
            columns: ["related_auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_jersey_id_fkey"
            columns: ["related_jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fees: {
        Row: {
          created_at: string
          fee_percentage: number
          fee_type: string
          id: string
          is_active: boolean
          max_fee: number | null
          min_fee: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_percentage: number
          fee_type: string
          id?: string
          is_active?: boolean
          max_fee?: number | null
          min_fee?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_percentage?: number
          fee_type?: string
          id?: string
          is_active?: boolean
          max_fee?: number | null
          min_fee?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          jersey_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          jersey_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          jersey_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          first_name: string | null
          id: string
          is_profile_complete: boolean | null
          last_name: string | null
          medusa_customer_id: string | null
          phone: string | null
          stripe_identity_verification_id: string | null
          stripe_identity_verification_status: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          is_profile_complete?: boolean | null
          last_name?: string | null
          medusa_customer_id?: string | null
          phone?: string | null
          stripe_identity_verification_id?: string | null
          stripe_identity_verification_status?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_profile_complete?: boolean | null
          last_name?: string | null
          medusa_customer_id?: string | null
          phone?: string | null
          stripe_identity_verification_id?: string | null
          stripe_identity_verification_status?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      sale_listings: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          jersey_id: string
          negotiable: boolean | null
          price: number
          seller_id: string
          shipping_cost_buyer: boolean | null
          shipping_cost_seller: boolean | null
          shipping_free_in_country: boolean | null
          shipping_local_only: boolean | null
          shipping_worldwide: boolean | null
          sold_at: string | null
          sold_to: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          jersey_id: string
          negotiable?: boolean | null
          price: number
          seller_id: string
          shipping_cost_buyer?: boolean | null
          shipping_cost_seller?: boolean | null
          shipping_free_in_country?: boolean | null
          shipping_local_only?: boolean | null
          shipping_worldwide?: boolean | null
          sold_at?: string | null
          sold_to?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          jersey_id?: string
          negotiable?: boolean | null
          price?: number
          seller_id?: string
          shipping_cost_buyer?: boolean | null
          shipping_cost_seller?: boolean | null
          shipping_free_in_country?: boolean | null
          shipping_local_only?: boolean | null
          shipping_worldwide?: boolean | null
          sold_at?: string | null
          sold_to?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_listings_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jerseys: {
        Row: {
          created_at: string
          id: string
          jersey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jerseys_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "jerseys"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shipping_addresses: {
        Row: {
          address_line_2: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          phone: string
          postal_code: string
          state: string | null
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_2?: string | null
          city: string
          country: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          phone: string
          postal_code: string
          state?: string | null
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string
          postal_code?: string
          state?: string | null
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          charges_enabled: boolean | null
          created_at: string | null
          id: string
          payouts_enabled: boolean | null
          status: string
          stripe_account_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          charges_enabled?: boolean | null
          created_at?: string | null
          id?: string
          payouts_enabled?: boolean | null
          status?: string
          stripe_account_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          charges_enabled?: boolean | null
          created_at?: string | null
          id?: string
          payouts_enabled?: boolean | null
          status?: string
          stripe_account_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          completed_at: string | null
          created_at: string | null
          currency: string | null
          id: string
          item_amount: number | null
          listing_id: string
          listing_type: string
          platform_fee_amount: number | null
          seller_fee_amount: number | null
          seller_id: string
          seller_payout_amount: number | null
          shipping_amount: number | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_transfer_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          item_amount?: number | null
          listing_id: string
          listing_type: string
          platform_fee_amount?: number | null
          seller_fee_amount?: number | null
          seller_id: string
          seller_payout_amount?: number | null
          shipping_amount?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          item_amount?: number | null
          listing_id?: string
          listing_type?: string
          platform_fee_amount?: number | null
          seller_fee_amount?: number | null
          seller_id?: string
          seller_payout_amount?: number | null
          shipping_amount?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_abandoned_drafts: {
        Args: never
        Returns: {
          deleted_count: number
          jersey_ids: string[]
        }[]
      }
      create_medusa_customer: {
        Args: { p_email: string; p_first_name?: string; p_last_name?: string }
        Returns: string
      }
      update_medusa_customer: {
        Args: {
          p_customer_id: string
          p_email: string
          p_first_name?: string
          p_last_name?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
