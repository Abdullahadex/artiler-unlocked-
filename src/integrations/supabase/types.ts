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
  public: {
    Tables: {
      auction_bidders: {
        Row: {
          auction_id: string
          first_bid_at: string
          id: string
          user_id: string
        }
        Insert: {
          auction_id: string
          first_bid_at?: string
          id?: string
          user_id: string
        }
        Update: {
          auction_id?: string
          first_bid_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bidders_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bidders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          created_at: string
          current_price: number
          description: string | null
          designer_id: string
          end_time: string
          id: string
          images: string[]
          materials: string | null
          required_bidders: number
          sizing: string | null
          start_price: number
          status: Database["public"]["Enums"]["auction_status"]
          signals_count: number
          priority_until: string | null
          escrow_memo: string | null
          title: string
          unique_bidder_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_price?: number
          description?: string | null
          designer_id: string
          end_time: string
          id?: string
          images?: string[]
          materials?: string | null
          required_bidders?: number
          sizing?: string | null
          start_price?: number
          status?: Database["public"]["Enums"]["auction_status"]
          signals_count?: number
          priority_until?: string | null
          escrow_memo?: string | null
          title: string
          unique_bidder_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_price?: number
          description?: string | null
          designer_id?: string
          end_time?: string
          id?: string
          images?: string[]
          materials?: string | null
          required_bidders?: number
          sizing?: string | null
          start_price?: number
          status?: Database["public"]["Enums"]["auction_status"]
          signals_count?: number
          priority_until?: string | null
          escrow_memo?: string | null
          title?: string
          unique_bidder_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctions_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_signals: {
        Row: {
          id: string
          user_id: string
          auction_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          auction_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          auction_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interest_signals_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_waitlisted: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          seller_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
          handshake_code: string | null
          archive_portfolio: string | null
          proof_of_archive_url: string | null
          is_authorized_seller: boolean
          has_accepted_terms: boolean
          reputation_score: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_waitlisted?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          seller_status?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
          handshake_code?: string | null
          archive_portfolio?: string | null
          proof_of_archive_url?: string | null
          is_authorized_seller?: boolean
          has_accepted_terms?: boolean
          reputation_score?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_waitlisted?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          seller_status?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
          handshake_code?: string | null
          archive_portfolio?: string | null
          proof_of_archive_url?: string | null
          is_authorized_seller?: boolean
          has_accepted_terms?: boolean
          reputation_score?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          event_name: string
          event_properties: Json
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_name: string
          event_properties?: Json
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_name?: string
          event_properties?: Json
          user_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_discourse: {
        Row: {
          id: string
          auction_id: string | null
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          auction_id?: string | null
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string | null
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_discourse_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_discourse_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_audit_logs: {
        Row: {
          id: string
          auction_id: string
          old_status: string | null
          new_status: string
          recorded_at: string
          changed_by: string | null
        }
        Insert: {
          id?: string
          auction_id: string
          old_status?: string | null
          new_status: string
          recorded_at?: string
          changed_by?: string | null
        }
        Update: {
          id?: string
          auction_id?: string
          old_status?: string | null
          new_status?: string
          recorded_at?: string
          changed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_audit_logs_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      auction_status: "LOCKED" | "UNLOCKED" | "SOLD" | "VOID" | "PROPOSED"
      user_role: "collector" | "designer" | "admin"
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
  public: {
    Enums: {
      auction_status: ["LOCKED", "UNLOCKED", "SOLD", "VOID", "PROPOSED"],
      user_role: ["collector", "designer"],
      seller_status: ["NONE", "PENDING", "APPROVED", "REJECTED"],
    },
  },
} as const
