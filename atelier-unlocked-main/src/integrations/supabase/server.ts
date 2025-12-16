import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a string is a valid Supabase URL (must start with https://)
 */
function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://') && url.includes('.supabase.co');
}

export async function createClient(): Promise<SupabaseClient<Database> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  // Check for valid URL and non-empty key
  if (!isValidSupabaseUrl(url) || !key || key.length < 20) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

