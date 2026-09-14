import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-only Supabase client. Uses the publishable/anon key, which is safe
 * to ship to the client - it relies on RLS, unlike the service-role admin
 * client in lib/supabase/admin.ts.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
