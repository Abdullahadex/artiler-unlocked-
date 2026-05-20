import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, template, data } = await request.json();

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    if (!supabase) {
      console.warn('Database not configured. Email auth skipped.');
      return NextResponse.json({ 
        success: false, 
        message: 'Database not configured' 
      });
    }
    
    const { data: { user } } = await supabase.auth.getUser();

    // Verify authentication OR verify it's the backend (e.g. cron job triggers this route)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await sendEmail(to, template, data);

    if (!result) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email service not configured or failed to send' 
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    console.error('Email error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


