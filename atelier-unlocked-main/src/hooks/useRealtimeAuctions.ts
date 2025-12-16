'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeAuctions() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  useEffect(() => {
    // Skip realtime subscriptions if Supabase is not configured
    if (!supabase) {
      return;
    }
    
    const channel: RealtimeChannel = supabase
      .channel('auctions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auctions',
        },
        (payload) => {
          console.log('Auction change:', payload);
          queryClient.invalidateQueries({ queryKey: ['auctions'] });
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClient.invalidateQueries({ queryKey: ['auction', payload.new.id as string] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          console.log('Bid change:', payload);
          if (payload.new && typeof payload.new === 'object' && 'auction_id' in payload.new) {
            const auctionId = payload.new.auction_id as string;
            queryClient.invalidateQueries({ queryKey: ['bids', auctionId] });
            queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
            queryClient.invalidateQueries({ queryKey: ['auctions'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);
}

