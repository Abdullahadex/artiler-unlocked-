import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Bid } from '@/types/database';

export const useBids = (auctionId: string | undefined) => {
  return useQuery({
    queryKey: ['bids', auctionId],
    queryFn: async () => {
      if (!auctionId) return [];
      
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

  return useMutation({
    mutationFn: async ({ auctionId, amount }: { auctionId: string; amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to place a bid');

      const { data, error } = await supabase
        .from('bids')
        .insert({
          auction_id: auctionId,
          user_id: user.id,
          amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { auctionId }) => {
      queryClient.invalidateQueries({ queryKey: ['bids', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
};
