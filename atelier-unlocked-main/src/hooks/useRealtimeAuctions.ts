'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeAuctions() {
  const queryClient = useQueryClient();

  useEffect(() => {
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
          if (payload.new?.id) {
            queryClient.invalidateQueries({ queryKey: ['auction', payload.new.id] });
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
          if (payload.new?.auction_id) {
            queryClient.invalidateQueries({ queryKey: ['bids', payload.new.auction_id] });
            queryClient.invalidateQueries({ queryKey: ['auction', payload.new.auction_id] });
            queryClient.invalidateQueries({ queryKey: ['auctions'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

