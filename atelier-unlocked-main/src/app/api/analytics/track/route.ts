import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { name, properties } = await request.json();

    const supabase = await createClient();
    
    if (!supabase) {
      // Analytics silently succeeds when Supabase is not configured
      return NextResponse.json({ success: true });
    }
    
    const { data: { user } } = await supabase.auth.getUser();

    // Store analytics event in database
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_name: name,
        event_properties: properties || {},
        user_id: user?.id || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Analytics tracking error:', error);
      // Don't fail the request if analytics fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

