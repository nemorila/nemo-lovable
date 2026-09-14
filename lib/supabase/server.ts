import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cookie-bound Supabase client for Server Components and Route Handlers.
 *
 * Reads the caller's session from request cookies via next/headers. Server
 * Components can't set cookies, so the setAll() call is wrapped in try/catch -
 * middleware is what actually refreshes the session cookie on every request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
            // Called from a Server Component - middleware handles the refresh.
          }
        },
      },
    }
  );
}
