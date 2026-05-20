import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !pubKey || !serviceKey) {
      console.error('Admin API Error: Missing environment variables');
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 503 });
    }

    // Step 1: Verify the caller is an admin using the public key
    const authClient = createClient(url, pubKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Check that caller has admin role
    const { data: callerProfile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // Step 2: Use the Service Role key to bypass RLS for admin operations
    const adminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (action === 'approve_user') {
      const { error } = await adminClient
        .from('profiles')
        .update({ is_waitlisted: false })
        .eq('id', userId);

      if (error) {
        console.error('Admin approve error:', error);
        return NextResponse.json({ error: `Failed to approve user: ${error.message}` }, { status: 500 });
      }

      // Fetch user to get email for notification
      const { data: { user: authUser }, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
      
      if (!authUserError && authUser?.email) {
        try {
          const { sendEmail } = await import('@/lib/email');
          // Fire-and-forget the email so it doesn't block the API response
          sendEmail(authUser.email, 'welcome', {
            firstName: authUser.user_metadata?.display_name || 'Collector'
          }).then(() => {
            console.log('Waitlist approval email sent to', authUser.email);
          }).catch(emailError => {
            console.error('Failed to send waitlist approval email:', emailError);
          });
        } catch (importError) {
          console.error('Failed to import email library:', importError);
        }
      }

      return NextResponse.json({ success: true, message: 'User approved successfully' });
    }

    if (action === 'waitlist_user') {
      const { error } = await adminClient
        .from('profiles')
        .update({ is_waitlisted: true })
        .eq('id', userId);

      if (error) {
        console.error('Admin waitlist error:', error);
        return NextResponse.json({ error: `Failed to waitlist user: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'User moved to waitlist' });
    }

    if (action === 'authorize_seller') {
      const { error } = await adminClient
        .from('profiles')
        .update({ 
          seller_status: 'APPROVED',
          role: 'designer',
          is_authorized_seller: true,
          is_waitlisted: false
        })
        .eq('id', userId);

      if (error) {
        console.error('Admin authorize error:', error);
        return NextResponse.json({ error: `Failed to authorize seller: ${error.message}` }, { status: 500 });
      }

      // Fetch user to get email for notification
      const { data: { user: authUser }, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
      
      if (!authUserError && authUser?.email) {
        try {
          const { sendEmail } = await import('@/lib/email');
          // Fire-and-forget the email so it doesn't block the API response
          sendEmail(authUser.email, 'welcome', {
            firstName: authUser.user_metadata?.display_name || 'Designer'
          }).then(() => {
            console.log('Designer approval email sent to', authUser.email);
          }).catch(emailError => {
            console.error('Failed to send designer approval email:', emailError);
          });
        } catch (importError) {
          console.error('Failed to import email library:', importError);
        }
      }

      return NextResponse.json({ success: true, message: 'Seller authorized successfully' });
    }

    if (action === 'slash_seller') {
      const { error } = await adminClient
        .from('profiles')
        .update({ 
          seller_status: 'REJECTED',
          is_authorized_seller: false
          // We don't automatically downgrade role to designer->collector here 
          // but we revoke their listing privileges.
        })
        .eq('id', userId);

      if (error) {
        console.error('Admin slash error:', error);
        return NextResponse.json({ error: `Failed to slash seller: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Seller privileges revoked' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Admin API fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
