// Re-export types from Supabase generated types for convenience
import type { Database, Tables, Enums } from '@/integrations/supabase/types';

export type AuctionStatus = Enums<'auction_status'>;
export type UserRole = Enums<'user_role'>;

export type Auction = Tables<'auctions'> & {
  designer?: Tables<'profiles'>;
  designer_name?: string | null; // Optional field for archive items to show different designer names
};

export type Bid = Tables<'bids'> & {
  bidder?: Tables<'profiles'>;
};

export type Profile = Tables<'profiles'>;

export type { Database };
