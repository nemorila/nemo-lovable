import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Returns the signed-in user for the current request, or null.
 *
 * Route handlers call this independently of middleware - the service-role
 * client bypasses RLS, so the server must never assume middleware already
 * checked auth for a given request.
 */
export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
