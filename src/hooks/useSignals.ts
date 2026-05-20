import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useUserSignal = (auctionId: string | undefined, userId: string | undefined) => {
  const supabase = getSupabaseClient();
  
  return useQuery({
    queryKey: ['user-signal', auctionId, userId],
    queryFn: async () => {
      if (!auctionId || !userId || !supabase) return false;
      
      const { data, error } = await supabase
        .from('interest_signals')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!auctionId && !!userId,
  });
};

export const useSignalInterest = () => {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ auctionId, userId }: { auctionId: string; userId: string }) => {
      if (!supabase) throw new Error('Database not available');
      
      const { error } = await supabase
        .from('interest_signals')
        .insert({
          auction_id: auctionId,
          user_id: userId
        });
      
      if (error) throw error;
      return { auctionId };
    },
    onSuccess: (data) => {
      toast.success('[PROTOCOL_ALERT]: Signal synchronized. Priority access granted.');
      queryClient.invalidateQueries({ queryKey: ['user-signal', data.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['proposed-intel'] });
    },
    onError: (error: Error) => {
      // Type casting safe for PostgREST errors in this context
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        toast.error('Signal already registered for this node.');
      } else {
        toast.error('Signal oscillation error.');
      }
    }
  });
};
