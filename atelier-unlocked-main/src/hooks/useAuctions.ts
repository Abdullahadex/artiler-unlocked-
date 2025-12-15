import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Auction } from '@/types/database';
import type { TablesInsert } from '@/integrations/supabase/types';

export const useAuctions = () => {
  return useQuery({
    queryKey: ['auctions'],
    queryFn: async () => {
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
    refetchInterval: 30000, // Refetch every 30 seconds to catch new uploads
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
};

export const useAuction = (id: string | undefined) => {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: async () => {
      if (!id) return null;
      
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

  return {
    ...useMutation({
      mutationFn: async (input: CreateAuctionInput) => {
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
      onSuccess: () => {
        // Invalidate and refetch auctions
        queryClient.invalidateQueries({ queryKey: ['auctions'] });
      },
    }),
    supabase,
  };
};
