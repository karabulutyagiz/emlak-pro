'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PasswordSetupPreview = {
  email: string;
  displayName: string;
  role: 'MUHASEBE' | 'YONETIM' | 'OPERASYON';
  expiresAt: string;
};

type CompletePasswordSetupPayload = {
  user: {
    id: string;
    publicId: string;
    email: string;
    displayName: string;
    createdAt: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
};

async function apiRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as { data?: T; message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || 'Istek basarisiz oldu.');
  }

  return payload?.data as T;
}

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [preview, setPreview] = useState<PasswordSetupPreview | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Sifre olusturma tokeni bulunamadi.');
      setIsLoading(false);
      return;
    }

    void loadPreview(token);
  }, [token]);

  async function loadPreview(nextToken: string) {
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiRequest<PasswordSetupPreview>(`/auth/setup-password/validate?token=${encodeURIComponent(nextToken)}`);
      setPreview(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Link dogrulanamadi.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Sifre en az 8 karakter olmali.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Sifre tekrar alani eslesmiyor.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<CompletePasswordSetupPayload>('/auth/setup-password/complete', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess('Sifreniz olusturuldu. Artik panele giris yapabilirsiniz.');
      setPassword('');
      setConfirmPassword('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sifre olusturulamadi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#07111f',
        color: '#f4f7fb',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#0f1b2d',
          borderRadius: 18,
          padding: 28,
          border: '1px solid #1d334c',
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Sifre olustur</h1>
        <p style={{ marginTop: 0, color: '#96abc5', lineHeight: 1.6 }}>
          Davet edilen personel icin ilk giris sifresini burada belirleyin.
        </p>

        {isLoading ? <div style={{ color: '#96abc5' }}>Link dogrulaniyor...</div> : null}
        {error ? <div style={{ color: '#ff9f9f', marginBottom: 16 }}>{error}</div> : null}

        {preview ? (
          <>
            <div style={{ marginBottom: 20, padding: 14, borderRadius: 14, background: '#12223a', border: '1px solid #17314c' }}>
              <div style={{ fontWeight: 700 }}>{preview.displayName}</div>
              <div style={{ color: '#96abc5', marginTop: 4 }}>{preview.email}</div>
              <div style={{ color: '#96abc5', marginTop: 4 }}>Rol: {preview.role}</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <input
                type="password"
                placeholder="Yeni sifre"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #2b435f', background: '#0b1726', color: '#f4f7fb', fontSize: 15 }}
              />
              <input
                type="password"
                placeholder="Sifre tekrar"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #2b435f', background: '#0b1726', color: '#f4f7fb', fontSize: 15 }}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ padding: '14px 16px', borderRadius: 12, border: 0, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                {isSubmitting ? 'Kaydediliyor...' : 'Sifreyi olustur'}
              </button>
            </form>
          </>
        ) : null}

        {success ? <div style={{ color: '#8ef0a7', marginTop: 16 }}>{success}</div> : null}
      </section>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#07111f', color: '#96abc5', fontFamily: 'Inter, Arial, sans-serif' }}>Link dogrulaniyor...</main>}>
      <SetPasswordContent />
    </Suspense>
  );
}
