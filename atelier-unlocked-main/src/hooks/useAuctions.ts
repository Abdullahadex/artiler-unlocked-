import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Auction } from '@/types/database';

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
