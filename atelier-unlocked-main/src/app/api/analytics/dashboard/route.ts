import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get analytics data
    const [
      { data: events },
      { data: auctions },
      { data: bids },
      { data: users },
    ] = await Promise.all([
      supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('auctions').select('*'),
      supabase.from('bids').select('*'),
      supabase.from('profiles').select('*'),
    ]);

    // Calculate metrics
    const metrics = {
      totalUsers: users?.length || 0,
      totalAuctions: auctions?.length || 0,
      totalBids: bids?.length || 0,
      totalRevenue: auctions?.filter(a => a.status === 'SOLD').reduce((sum, a) => sum + a.current_price, 0) || 0,
      activeAuctions: auctions?.filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED').length || 0,
      conversionRate: auctions?.length ? ((auctions.filter(a => a.status === 'SOLD').length / auctions.length) * 100).toFixed(2) : 0,
      averageBidAmount: bids?.length ? Math.round(bids.reduce((sum, b) => sum + b.amount, 0) / bids.length) : 0,
      events: events || [],
    };

    return NextResponse.json(metrics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

