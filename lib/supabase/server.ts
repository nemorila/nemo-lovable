import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service role key.
 *
 * NEVER import this from a client component. SUPABASE_SECRET_KEY is an admin
 * credential that bypasses RLS - shipping it to the browser would hand every
 * visitor full database access.
 */
let cachedClient: SupabaseClient | null = null;

export const PREVIEW_BUCKET = 'previews';

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local'
    );
  }

  cachedClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}

/** True when the env vars are present, so callers can degrade instead of throwing. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
