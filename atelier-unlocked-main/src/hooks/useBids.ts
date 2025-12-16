import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Bid } from '@/types/database';

export const useBids = (auctionId: string | undefined) => {
  const supabase = getSupabaseClient();
  
  return useQuery({
    queryKey: ['bids', auctionId],
    queryFn: async () => {
      if (!auctionId || !supabase) return [];
      
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          bidder:profiles!bids_user_id_fkey(*)
        `)
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Bid[];
    },
    enabled: !!auctionId,
  });
};

export const usePlaceBid = () => {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ auctionId, amount }: { auctionId: string; amount: number }) => {
      if (!supabase) {
        throw new Error('Database not configured');
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to place a bid');

      // Use API route for better validation and rate limiting
      const response = await fetch('/api/bids/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auctionId, amount }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place bid');
      }

      return result.bid;
    },
    onSuccess: (_, { auctionId }) => {
      queryClient.invalidateQueries({ queryKey: ['bids', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
};
