import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';
import type { Database } from '@/integrations/supabase/types';

export const runtime = 'nodejs';

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://') && url.includes('.supabase.co');
}

export async function POST(request: NextRequest) {
  try {
    const { auctionId, amount } = await request.json();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (!isValidSupabaseUrl(url) || !key || key.length < 20) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Create response object to hold cookies
    let response = new NextResponse();
    
    // Create Supabase client that reads cookies from the request and sets them on the response
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { 
          error: authError?.message || 'Unauthorized. Please sign in to place a bid.',
          details: authError ? `Auth error: ${authError.message}` : 'No user session found'
        },
        { status: 401 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = rateLimit(`bid:${user.id}`, 20, 60000); // 20 bids per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait before placing another bid.',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // Get auction
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Validations
    if (auction.status === 'SOLD' || auction.status === 'VOID') {
      return NextResponse.json(
        { error: 'This auction has ended' },
        { status: 400 }
      );
    }

    if (auction.designer_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot bid on your own auction' },
        { status: 400 }
      );
    }

    if (amount <= auction.current_price) {
      return NextResponse.json(
        { error: `Bid must be higher than current price of €${auction.current_price.toLocaleString()}` },
        { status: 400 }
      );
    }

    const endTime = new Date(auction.end_time);
    if (endTime < new Date()) {
      return NextResponse.json(
        { error: 'This auction has ended' },
        { status: 400 }
      );
    }

    // Place bid (database trigger handles the rest)
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        auction_id: auctionId,
        user_id: user.id,
        amount,
      })
      .select()
      .single();

    if (bidError) {
      return NextResponse.json(
        { error: bidError.message },
        { status: 400 }
      );
    }

    // Get user email for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Send email notification (async, don't wait)
    if (user.email) {
      sendEmail(user.email, 'bidConfirmation', {
        amount,
        auctionTitle: auction.title,
        auctionId,
      }).catch(console.error);

      // Notify previous highest bidder if they were outbid
      const { data: previousBids } = await supabase
        .from('bids')
        .select('*, bidder:profiles!bids_user_id_fkey(*)')
        .eq('auction_id', auctionId)
        .order('amount', { ascending: false })
        .limit(2);

      if (previousBids && previousBids.length > 1) {
        const previousBidder = previousBids[1];
        if (previousBidder.bidder && previousBidder.bidder.id !== user.id) {
          // Would need email field in profiles
          // sendEmail(previousBidder.bidder.email, 'outbid', {...})
        }
      }
    }

    // Create JSON response with cookies from Supabase
    const jsonResponse = NextResponse.json({
      success: true,
      bid,
      remaining: rateLimitResult.remaining,
    });
    
    // Copy cookies from the Supabase response
    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return jsonResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to place bid';
    console.error('Bid placement error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

