'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ButtonUI from '@/components/ui/shadcn/button';
import HeaderBrandKit from '@/components/shared/header/BrandKit/BrandKit';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    setError(null);

    const supabase = createClient();
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('redirect', redirect);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl.toString() },
    });

    if (signInError) {
      setStatus('error');
      setError(signInError.message);
      return;
    }

    setStatus('sent');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-32 px-16 bg-background-base">
      <HeaderBrandKit />

      <div className="w-full max-w-[380px] bg-white rounded-20 p-24 border border-border-faint">
        <h1 className="text-heading-medium text-center mb-4">Logga in</h1>
        <p className="text-body-medium text-black-alpha-48 text-center mb-24">
          Vi skickar en inloggningslänk till din e-post.
        </p>

        {status === 'sent' ? (
          <p className="text-body-medium text-center">
            Kolla din inkorg – vi har skickat en magisk länk till <strong>{email}</strong>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-12">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@exempel.se"
              className="w-full px-12 py-10 text-body-medium rounded-10 border border-border-faint focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <ButtonUI type="submit" variant="primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Skickar…' : 'Skicka magisk länk'}
            </ButtonUI>
            {status === 'error' && (
              <p className="text-body-small text-red-500 text-center">{error}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
