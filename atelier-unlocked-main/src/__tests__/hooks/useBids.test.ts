import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBids, usePlaceBid } from '@/hooks/useBids';
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBids', () => {
  it('fetches bids for an auction', async () => {
    const mockBids = [
      {
        id: '1',
        auction_id: 'auction-1',
        user_id: 'user-1',
        amount: 1000,
        created_at: new Date().toISOString(),
        bidder: { id: 'user-1', display_name: 'Test User' },
      },
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockBids, error: null }),
    });

    const { result } = renderHook(() => useBids('auction-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBids);
  });
});

describe('usePlaceBid', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('places a bid successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        bid: {
          id: '1',
          auction_id: 'auction-1',
          user_id: 'user-1',
          amount: 2000,
        },
      }),
    });

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    });

    const { result } = renderHook(() => usePlaceBid(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      auctionId: 'auction-1',
      amount: 2000,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/bids/place',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ auctionId: 'auction-1', amount: 2000 }),
      })
    );
  });
});

