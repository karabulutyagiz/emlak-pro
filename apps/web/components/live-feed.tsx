'use client';

import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSessionToken } from './session';

type FeedItem = {
  id: string;
  title: string;
  price?: number | null;
  currency?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  lifecycle?: string | null;
  match?: {
    botId: string;
  };
};

const fallbackFeed: FeedItem[] = [
  {
    id: 'preview-1',
    title: 'Kadıköy 2+1 Kiralık Daire',
    price: 39500,
    currency: 'TRY',
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Feneryolu',
    lifecycle: 'NEW',
    match: { botId: 'Kadıköy Kiralık' },
  },
  {
    id: 'preview-2',
    title: 'Beşiktaş 3+1 Satılık Daire',
    price: 7950000,
    currency: 'TRY',
    city: 'İstanbul',
    district: 'Beşiktaş',
    neighborhood: 'Dikilitaş',
    lifecycle: 'UPDATED',
    match: { botId: 'Merkezî Satılık' },
  },
];

function formatPrice(price?: number | null, currency?: string | null) {
  if (typeof price !== 'number') return 'Fiyat bilgisi yok';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

export function LiveFeed() {
  const [feed, setFeed] = useState<FeedItem[]>(fallbackFeed);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const socketUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000', []);

  useEffect(() => {
    const sessionToken = getSessionToken();
    const socket: Socket = io(`${socketUrl}/realtime`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('feed.subscribe', sessionToken ? { token: sessionToken } : {});
    });

    socket.on('disconnect', () => {
      setStatus('offline');
    });

    socket.on('connect_error', () => {
      setStatus('offline');
    });

    socket.on('listing.created', (payload: { data: FeedItem }) => {
      setFeed((current) => {
        const withoutSame = current.filter((item) => item.id !== payload.data.id);
        return [payload.data, ...withoutSame].slice(0, 20);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [socketUrl]);

  return (
    <article style={{ background: '#0f1b2d', borderRadius: 16, padding: 20, border: '1px solid #1d334c' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Canlı akış</h2>
        <span style={{ padding: '6px 10px', borderRadius: 999, background: status === 'connected' ? '#12351f' : '#3b1f12', color: status === 'connected' ? '#8ef0a7' : '#ffbf8b', fontSize: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          {status === 'connected' ? 'WebSocket bağlı' : status === 'connecting' ? 'Bağlanıyor' : 'Çevrim dışı önizleme'}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {feed.map((listing) => (
          <div key={listing.id} style={{ padding: 16, borderRadius: 12, background: '#12223a', border: '1px solid #1c3553' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong>{listing.title}</strong>
              <span>{formatPrice(listing.price, listing.currency)}</span>
            </div>
            <div style={{ color: '#8aa0bf', marginTop: 8 }}>
              {[listing.city, listing.district, listing.neighborhood].filter(Boolean).join(' / ') || 'Konum bilgisi yok'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <span style={{ padding: '6px 10px', borderRadius: 999, background: '#1a3557', color: '#c9ddf7', fontSize: 12 }}>
                {listing.lifecycle ?? 'NEW'}
              </span>
              {listing.match?.botId ? (
                <span style={{ padding: '6px 10px', borderRadius: 999, background: '#1a3557', color: '#c9ddf7', fontSize: 12 }}>
                  Bot: {listing.match.botId}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
