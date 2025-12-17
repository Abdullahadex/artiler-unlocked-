// Re-export types from Supabase generated types for convenience
import type { Database, Tables, Enums } from '@/integrations/supabase/types';

export type AuctionStatus = Enums<'auction_status'>;
export type UserRole = Enums<'user_role'>;

export type Auction = Tables<'auctions'> & {
  designer?: Tables<'profiles'>;
  designer_name?: string | null; // Optional field for archive items to show different designer names
  fulfillment_status?: string | null; // Fulfillment status: 'pending_payment', 'address_collected', 'shipped', 'delivered', 'completed'
  winner_id?: string | null; // ID of the winning bidder
  payment_intent_id?: string | null; // Stripe payment intent ID
  tracking_number?: string | null; // Shipping tracking number
  shipped_at?: string | null; // When the item was shipped
};

export type Bid = Tables<'bids'> & {
  bidder?: Tables<'profiles'>;
};

export type Profile = Tables<'profiles'>;

export type { Database };
