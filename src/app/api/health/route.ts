import { NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'not_configured',
      });
    }
    
    // Simple health check
    const { error } = await supabase.from('auctions').select('id').limit(1);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: error ? 'disconnected' : 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

