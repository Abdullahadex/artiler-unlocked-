'use client';

import * as SupabaseJS from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * [Protocol V5.5]: Total-Lockdown Factory
 * Resolves the creation mechanism by supporting both factory functions and direct class instantiation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveCreationProtocol(libSource: any) {
  // 1. Standard Factory Function (Preferred)
  if (typeof libSource.createClient === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (url: string, key: string, options?: any) => libSource.createClient(url, key, options);
  }

  // 2. Manifest Object Factory
  if (libSource.default && typeof libSource.default.createClient === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (url: string, key: string, options?: any) => libSource.default.createClient(url, key, options);
  }

  // 3. [THE NUCLEAR OPTION]: Direct Class Instantiation
  // If we identify the Class constructor (even if aliased or misbound), we invoke with 'new'
  const ClassCtor = libSource.SupabaseClient || libSource.default?.SupabaseClient || libSource.default;
  if (typeof ClassCtor === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (url: string, key: string, options?: any) => new ClassCtor(url, key, options);
  }

  return null;
}

let cachedClient: SupabaseClient<Database> | null = null;

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://') && url.includes('.supabase.co');
}

/**
 * [Protocol V5.5]: Secure Armor Client
 */
export function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  if (typeof window === 'undefined') {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!isValidSupabaseUrl(url) || !key || key.length < 20) {
    return null;
  }

  const initialize = resolveCreationProtocol(SupabaseJS);
  if (!initialize) {
    console.error('[PROTOCOL_V5.5_FATAL]: Identity Provider resolution failed total lockdown.');
    return null;
  }

  try {
    cachedClient = initialize(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error('[PROTOCOL_V5.5_INSTANTIATION_FAIL]:', error);
    return null;
  }

  return cachedClient;
}

/**
 * [Build Guard]: Unconfigured Proxy
 */
function createUnconfiguredSupabaseProxy(): SupabaseClient<Database> {
  const message = 'Infrastructure link pending authorization.';
  const makeProxy = (path: string) =>
    new Proxy(function () {}, {
      get(_target, prop) {
        if (prop === Symbol.toStringTag) return 'SupabaseProxy';
        if (prop === 'toString') return () => `[${path}]`;
        if (prop === 'valueOf') return () => null;
        return makeProxy(`${path}.${String(prop)}`);
      },
      apply() {
        if (typeof window !== 'undefined') throw new Error(message);
        return null;
      },
    });

  return makeProxy('supabase') as unknown as SupabaseClient<Database>;
}

export const supabase = getSupabaseClient() ?? createUnconfiguredSupabaseProxy();
