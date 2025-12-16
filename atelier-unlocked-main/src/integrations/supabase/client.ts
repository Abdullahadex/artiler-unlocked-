'use client';

// NOTE: Import from the explicit module entrypoint to avoid Next/webpack warnings
// around Supabase's ESM wrapper default export resolution.
import { createClient as createSupabaseClient } from '@supabase/supabase-js/dist/module/index.js';
import type { Database } from './types';

let cachedClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Check if a string is a valid Supabase URL (must start with https://)
 */
function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://') && url.includes('.supabase.co');
}

/**
 * Lazily create a Supabase browser client if public env vars are configured.
 * This avoids failing the build/prerender when env vars aren't set yet.
 */
export function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  // Check for valid URL and non-empty key
  if (!isValidSupabaseUrl(url) || !key || key.length < 20) {
    return null;
  }

  cachedClient = createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

function createUnconfiguredSupabaseProxy(): ReturnType<typeof createSupabaseClient<Database>> {
  const message =
    'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';

  const makeProxy = (path: string) =>
    new Proxy(function () {}, {
      get(_target, prop) {
        // Allow basic introspection without throwing
        if (prop === Symbol.toStringTag) return 'SupabaseProxy';
        if (prop === 'toString') return () => `[${path}]`;
        if (prop === 'valueOf') return () => null;
        return makeProxy(`${path}.${String(prop)}`);
      },
      apply() {
        throw new Error(message);
      },
    });

  return makeProxy('supabase') as unknown as ReturnType<typeof createSupabaseClient<Database>>;
}

// Back-compat: existing code imports `supabase`. It won't throw during build/import.
export const supabase: ReturnType<typeof createSupabaseClient<Database>> =
  getSupabaseClient() ?? createUnconfiguredSupabaseProxy();
