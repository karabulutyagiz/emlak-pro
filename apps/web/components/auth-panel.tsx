'use client';

import { FormEvent, useState } from 'react';
import { apiRequest, AuthPayload } from './api';
import { BrandMark } from './brand-mark';
import { saveSession } from './session';

type AuthPanelProps = {
  onAuthenticated: (payload: AuthPayload['user']) => void;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #2b435f',
  background: '#0b1726',
  color: '#f4f7fb',
  fontSize: 15,
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = await apiRequest<AuthPayload>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      saveSession(payload.session.token, payload.user);
      onAuthenticated(payload.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article
      style={{
        background: '#0f1b2d',
        borderRadius: 18,
        padding: 28,
        border: '1px solid #1d334c',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: '#7dd3fc', marginBottom: 22 }}>
        <BrandMark size={28} />
        <span style={{ fontWeight: 700, letterSpacing: 0.3 }}>Webico EMLAK</span>
      </div>

      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 28, letterSpacing: -0.4 }}>Giriş yapın</h2>
        <p style={{ margin: '10px 0 0', color: '#96abc5', lineHeight: 1.7 }}>
          Webico EMLAK operasyon paneline erişmek için oturum açın.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-posta adresi" style={inputStyle} />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Şifre"
          style={inputStyle}
        />
        {error ? <div style={{ color: '#ff9f9f', fontSize: 14 }}>{error}</div> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: '14px 16px', borderRadius: 12, border: 0, background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 700 }}
        >
          {isSubmitting ? 'Giriş yapılıyor...' : 'Panele giriş yap'}
        </button>
      </form>
    </article>
  );
}
