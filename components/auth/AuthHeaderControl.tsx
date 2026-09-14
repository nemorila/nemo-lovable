'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { createClient } from '@/lib/supabase/client';
import ButtonUI from '@/components/ui/shadcn/button';

export default function AuthHeaderControl({ dark = false }: { dark?: boolean }) {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  if (loading) return null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    if (dark) {
      return (
        <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
          Logga in
        </Link>
      );
    }
    return (
      <Link href="/login">
        <ButtonUI variant="tertiary">Logga in</ButtonUI>
      </Link>
    );
  }

  if (dark) {
    return (
      <div className="flex items-center gap-16">
        <span className="text-sm text-white/40 hidden sm:inline">{user.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Logga ut
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <span className="text-label-small text-black-alpha-48 hidden sm:inline">{user.email}</span>
      <ButtonUI variant="tertiary" onClick={handleLogout}>
        Logga ut
      </ButtonUI>
    </div>
  );
}
