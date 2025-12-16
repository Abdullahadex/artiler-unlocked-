import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Auction } from '@/types/database';
import type { TablesInsert } from '@/integrations/supabase/types';

export const useAuctions = () => {
  const supabase = getSupabaseClient();
  
  return useQuery({
    queryKey: ['auctions'],
    queryFn: async () => {
      if (!supabase) {
        return [] as Auction[];
      }
      
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          *,
          designer:profiles!auctions_designer_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Auction[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
};

export const useAuction = (id: string | undefined) => {
  const supabase = getSupabaseClient();
  
  return useQuery({
    queryKey: ['auction', id],
    queryFn: async () => {
      if (!id || !supabase) return null;
      
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          *,
          designer:profiles!auctions_designer_id_fkey(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Auction | null;
    },
    enabled: !!id,
  });
};

interface CreateAuctionInput {
  title: string;
  description?: string | null;
  materials?: string | null;
  sizing?: string | null;
  images: string[];
  startPrice: number;
  requiredBidders: number;
  endTime: string;
}

export const useCreateAuction = () => {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return {
    ...useMutation({
      mutationFn: async (input: CreateAuctionInput) => {
        if (!supabase) {
          throw new Error('Database not configured');
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('You must be signed in to create an auction');
        }

        const auctionData: TablesInsert<'auctions'> = {
          designer_id: user.id,
          title: input.title,
          description: input.description || null,
          materials: input.materials || null,
          sizing: input.sizing || null,
          images: input.images,
          start_price: input.startPrice,
          current_price: input.startPrice,
          required_bidders: input.requiredBidders,
          end_time: input.endTime,
          status: 'LOCKED',
          unique_bidder_count: 0,
        };

        const { data, error } = await supabase
          .from('auctions')
          .insert(auctionData)
          .select(`
            *,
            designer:profiles!auctions_designer_id_fkey(*)
          `)
          .single();

        if (error) throw error;
        return data as Auction;
      },
      onSuccess: async (newAuction) => {
        queryClient.setQueryData(['auctions'], (old: Auction[] | undefined) => {
          if (!old) return [newAuction];
          const exists = old.some(a => a.id === newAuction.id);
          if (exists) return old;
          return [newAuction, ...old];
        });
        await queryClient.refetchQueries({ queryKey: ['auctions'] });
      },
    }),
    supabase,
  };
};

export const useDeleteAuction = () => {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (auctionId: string) => {
      if (!supabase) {
        throw new Error('Database not configured');
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be signed in to delete an auction');
      }

      const { data: auction, error: fetchError } = await supabase
        .from('auctions')
        .select('id, designer_id, status, unique_bidder_count')
        .eq('id', auctionId)
        .single();

      if (fetchError) throw fetchError;
      if (!auction) throw new Error('Auction not found');
      if (auction.designer_id !== user.id) {
        throw new Error('You can only delete your own auctions');
      }

      if (auction.status !== 'LOCKED') {
        throw new Error('Can only delete LOCKED auctions. Once bids are placed, auctions cannot be removed.');
      }

      if (auction.unique_bidder_count > 0) {
        throw new Error('Cannot delete auction with existing bids');
      }

      const { error } = await supabase
        .from('auctions')
        .delete()
        .eq('id', auctionId);

      if (error) throw error;
      return auctionId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['auctions'], (old: Auction[] | undefined) => {
        if (!old) return [];
        return old.filter(a => a.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
};
