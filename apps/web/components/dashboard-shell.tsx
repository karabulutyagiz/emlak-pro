'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest, BotPayload, ListingDetailPayload, ListingPayload } from './api';
import { AuthPanel } from './auth-panel';
import { BrandMark } from './brand-mark';
import { LiveFeed } from './live-feed';
import { clearSession, getSessionToken, getStoredUser, StoredUser } from './session';

const cardStyle: React.CSSProperties = {
  background: '#0f1b2d',
  borderRadius: 16,
  padding: 20,
  border: '1px solid #1d334c',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #27415d',
  background: '#0b1726',
  color: '#f4f7fb',
};

function formatPrice(value: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);
}

function formatStatus(status?: string) {
  switch (status) {
    case 'TO_CALL':
      return 'Aranacak';
    case 'CALLED':
      return 'Arandı';
    case 'APPOINTMENT':
      return 'Randevu';
    case 'SUITABLE':
      return 'Uygun';
    case 'PASSED':
      return 'Pas';
    case 'LOST':
      return 'Kaçtı';
    default:
      return 'Yeni';
  }
}

export function DashboardShell() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bots, setBots] = useState<BotPayload[]>([]);
  const [listings, setListings] = useState<ListingPayload[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingDetailPayload | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botName, setBotName] = useState('Kadıköy Kiralık');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('Kadıköy');
  const [roomCount, setRoomCount] = useState('2+1');

  const selectedState = selectedListing?.states[0] ?? null;

  const stats = useMemo(
    () => [
      { label: 'Aktif Bot', value: String(bots.filter((bot) => bot.isActive).length) },
      { label: 'Canlı Eşleşme', value: String(listings.length) },
      { label: 'Favori', value: String(listings.filter((listing) => listing.states[0]?.isFavorite).length) },
      { label: 'Kullanıcı ID', value: user?.publicId ?? '-' },
    ],
    [bots, listings, user],
  );

  async function loadDashboard(sessionToken: string) {
    setIsLoading(true);
    setError(null);

    try {
      const [profile, userBots, userListings] = await Promise.all([
        apiRequest<StoredUser>('/auth/me', { token: sessionToken }),
        apiRequest<BotPayload[]>('/bots', { token: sessionToken }),
        apiRequest<ListingPayload[]>('/listings', { token: sessionToken }),
      ]);

      setUser(profile);
      setBots(userBots);
      setListings(userListings);

      if (selectedListingId) {
        const stillExists = userListings.some((listing) => listing.id === selectedListingId);
        if (!stillExists) {
          setSelectedListingId(null);
          setSelectedListing(null);
        }
      }
    } catch (loadError) {
      clearSession();
      setUser(null);
      setToken(null);
      setError(loadError instanceof Error ? loadError.message : 'Panel verisi alınamadı.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadListingDetail(listingId: string, sessionToken: string) {
    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await apiRequest<ListingDetailPayload>(`/listings/${listingId}`, {
        token: sessionToken,
      });

      setSelectedListing(detail);
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'İlan detayı alınamadı.');
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    const existingToken = getSessionToken();
    const existingUser = getStoredUser();

    setToken(existingToken);
    setUser(existingUser);

    if (existingToken) {
      void loadDashboard(existingToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedListingId || !token) {
      return;
    }

    void loadListingDetail(selectedListingId, token);
  }, [selectedListingId, token]);

  async function handleCreateBot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    try {
      await apiRequest<BotPayload>('/bots', {
        method: 'POST',
        token,
        body: {
          name: botName,
          city,
          district,
          roomCount,
        },
      });

      await loadDashboard(token);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Bot oluşturulamadı.');
    }
  }

  async function handleUpdateListingState(nextState: { isFavorite?: boolean; status?: string }) {
    if (!token || !selectedListingId) return;

    try {
      await apiRequest(`/listings/${selectedListingId}/state`, {
        method: 'PATCH',
        token,
        body: nextState,
      });

      await Promise.all([loadDashboard(token), loadListingDetail(selectedListingId, token)]);
    } catch (updateError) {
      setDetailError(updateError instanceof Error ? updateError.message : 'İlan durumu güncellenemedi.');
    }
  }

  async function handleCreateNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedListingId || !noteBody.trim()) return;

    try {
      await apiRequest(`/listings/${selectedListingId}/notes`, {
        method: 'POST',
        token,
        body: {
          body: noteBody,
        },
      });

      setNoteBody('');
      await loadListingDetail(selectedListingId, token);
    } catch (noteError) {
      setDetailError(noteError instanceof Error ? noteError.message : 'Not eklenemedi.');
    }
  }

  function handleAuthenticated(nextUser: StoredUser) {
    const sessionToken = getSessionToken();
    setUser(nextUser);
    setToken(sessionToken);

    if (sessionToken) {
      void loadDashboard(sessionToken);
    }
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setToken(null);
    setBots([]);
    setListings([]);
    setSelectedListingId(null);
    setSelectedListing(null);
  }

  return (
    <main style={{ padding: 32, background: '#07111f', minHeight: '100vh' }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: '#7dd3fc', marginBottom: 6 }}>
            <BrandMark size={24} />
            <p style={{ margin: 0 }}>Webico EMLAK</p>
          </div>
          <h1 style={{ margin: '8px 0 12px', fontSize: 40, letterSpacing: -0.8 }}>Canlı ilan operasyon merkezi</h1>
          <p style={{ maxWidth: 720, color: '#9bb0ca', lineHeight: 1.6 }}>
            Danışman, kendisine verilen bilgilerle giriş yapar; kendi botlarını oluşturur, eşleşen ilanları canlı akışta ve listede görür.
          </p>
        </div>
        <div style={{ ...cardStyle, minWidth: 280 }}>
          <div style={{ color: '#a8b3c7', marginBottom: 8 }}>Oturum</div>
          {user ? (
            <>
              <div style={{ fontWeight: 700 }}>{user.displayName}</div>
              <div style={{ color: '#8aa0bf', marginTop: 4 }}>{user.email}</div>
              <div style={{ color: '#8aa0bf', marginTop: 4 }}>ID: {user.publicId}</div>
              <button
                type="button"
                onClick={handleLogout}
                style={{ marginTop: 14, padding: '10px 12px', borderRadius: 12, border: '1px solid #1f3a58', background: 'transparent', color: '#c9ddf7', cursor: 'pointer' }}
              >
                Çıkış yap
              </button>
            </>
          ) : (
            <div style={{ color: '#8aa0bf' }}>Paneli kullanmak için giriş yapın.</div>
          )}
        </div>
      </section>

      {!user ? (
        <section style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <AuthPanel onAuthenticated={handleAuthenticated} />
          </div>
        </section>
      ) : (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            {stats.map((item) => (
              <article key={item.label} style={cardStyle}>
                <div style={{ color: '#8aa0bf', marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{item.value}</div>
              </article>
            ))}
          </section>

          {error ? <div style={{ marginBottom: 16, color: '#ff9f9f' }}>{error}</div> : null}
          {isLoading ? <div style={{ marginBottom: 16, color: '#8aa0bf' }}>Panel verileri yükleniyor...</div> : null}

          <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <LiveFeed />

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Bot oluştur</h2>
              <form onSubmit={handleCreateBot} style={{ display: 'grid', gap: 12 }}>
                <input value={botName} onChange={(event) => setBotName(event.target.value)} style={inputStyle} placeholder="Bot adı" />
                <input value={city} onChange={(event) => setCity(event.target.value)} style={inputStyle} placeholder="Şehir" />
                <input value={district} onChange={(event) => setDistrict(event.target.value)} style={inputStyle} placeholder="İlçe" />
                <input value={roomCount} onChange={(event) => setRoomCount(event.target.value)} style={inputStyle} placeholder="Oda sayısı" />
                <button type="submit" style={{ padding: '12px 14px', borderRadius: 12, border: 0, background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  Botu kaydet
                </button>
              </form>

              <div style={{ marginTop: 18, color: '#8aa0bf', fontSize: 14 }}>Filtre alanları bu aşamada şehir, ilçe, oda sayısı, fiyat ve anahtar kelime üzerinden çalışır.</div>
            </article>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.15fr', gap: 16 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Botlarım</h2>
              <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid #1c3553' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 0.6fr 0.6fr', background: '#102034', color: '#89a0bc', fontSize: 12, padding: '12px 14px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  <div>Bot</div>
                  <div>Bölge</div>
                  <div>Oda</div>
                  <div>Durum</div>
                </div>
                {bots.length === 0 ? <div style={{ color: '#8aa0bf', padding: 16 }}>Henüz bot yok.</div> : null}
                {bots.map((bot, index) => (
                  <div key={bot.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 0.6fr 0.6fr', padding: '14px', background: index % 2 === 0 ? '#12223a' : '#0f1d31', borderTop: '1px solid #17314c', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ color: '#f4f7fb', fontWeight: 600 }}>{bot.name}</div>
                      <div style={{ color: '#7f97b5', fontSize: 12, marginTop: 4 }}>{formatPrice(bot.minPrice)} - {formatPrice(bot.maxPrice)}</div>
                    </div>
                    <div style={{ color: '#c7d5e6', fontSize: 14 }}>{[bot.city, bot.district, bot.neighborhood].filter(Boolean).join(' / ') || 'Bölge tanımsız'}</div>
                    <div style={{ color: '#c7d5e6', fontSize: 14 }}>{bot.roomCount || '-'}</div>
                    <div style={{ color: bot.isActive ? '#8ef0a7' : '#ffbf8b', fontSize: 13, fontWeight: 600 }}>{bot.isActive ? 'Aktif' : 'Pasif'}</div>
                  </div>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Eşleşen ilanlar</h2>
              <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid #1c3553' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 0.8fr 0.8fr', background: '#102034', color: '#89a0bc', fontSize: 12, padding: '12px 14px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  <div>İlan</div>
                  <div>Konum</div>
                  <div>Fiyat</div>
                  <div>Durum</div>
                </div>
                {listings.length === 0 ? <div style={{ color: '#8aa0bf', padding: 16 }}>Henüz eşleşen ilan yok.</div> : null}
                {listings.map((listing, index) => (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => setSelectedListingId(listing.id)}
                    style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 0.8fr 0.8fr', width: '100%', padding: '14px', background: selectedListingId === listing.id ? '#173154' : index % 2 === 0 ? '#12223a' : '#0f1d31', border: 0, borderTop: '1px solid #17314c', textAlign: 'left', color: '#f4f7fb', cursor: 'pointer', gap: 12, alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{listing.title}</div>
                      <div style={{ color: '#7f97b5', fontSize: 12, marginTop: 4 }}>{listing.lifecycle} • Eşleşme: {listing.matches.length}</div>
                    </div>
                    <div style={{ color: '#c7d5e6', fontSize: 14 }}>{[listing.city, listing.district].filter(Boolean).join(' / ') || 'Konum yok'}</div>
                    <div style={{ color: '#c7d5e6', fontSize: 14 }}>{formatPrice(listing.price)} {listing.currency || ''}</div>
                    <div style={{ color: '#c7d5e6', fontSize: 14 }}>{formatStatus(listing.states[0]?.status)}</div>
                  </button>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>İlan detayı</h2>
              {!selectedListingId ? <div style={{ color: '#8aa0bf' }}>Listeden bir ilan seçin.</div> : null}
              {isDetailLoading ? <div style={{ color: '#8aa0bf' }}>İlan detayı yükleniyor...</div> : null}
              {detailError ? <div style={{ color: '#ff9f9f', marginBottom: 12 }}>{detailError}</div> : null}
              {selectedListing ? (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <strong style={{ fontSize: 18, lineHeight: 1.4 }}>{selectedListing.title}</strong>
                    <div style={{ color: '#8aa0bf', marginTop: 8 }}>
                      {[selectedListing.city, selectedListing.district, selectedListing.neighborhood].filter(Boolean).join(' / ') || 'Konum yok'}
                    </div>
                    <div style={{ color: '#f4f7fb', marginTop: 8, fontSize: 20, fontWeight: 700 }}>
                      {formatPrice(selectedListing.price)} {selectedListing.currency || ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 10px', borderRadius: 999, background: '#1a3557', color: '#c9ddf7', fontSize: 12 }}>{selectedListing.lifecycle}</span>
                    <span style={{ padding: '6px 10px', borderRadius: 999, background: '#1a3557', color: '#c9ddf7', fontSize: 12 }}>Durum: {selectedState?.status ?? 'NEW'}</span>
                    <span style={{ padding: '6px 10px', borderRadius: 999, background: selectedState?.isFavorite ? '#3c2910' : '#1a3557', color: '#c9ddf7', fontSize: 12 }}>
                      {selectedState?.isFavorite ? 'Favori' : 'Normal'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateListingState({ isFavorite: !selectedState?.isFavorite })}
                      style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #1f3a58', background: 'transparent', color: '#c9ddf7', cursor: 'pointer' }}
                    >
                      {selectedState?.isFavorite ? 'Favoriden çıkar' : 'Favoriye al'}
                    </button>
                    <select
                      value={selectedState?.status ?? 'NEW'}
                      onChange={(event) => void handleUpdateListingState({ status: event.target.value })}
                      style={inputStyle}
                    >
                      <option value="NEW">NEW</option>
                      <option value="TO_CALL">TO_CALL</option>
                      <option value="CALLED">CALLED</option>
                      <option value="APPOINTMENT">APPOINTMENT</option>
                      <option value="SUITABLE">SUITABLE</option>
                      <option value="PASSED">PASSED</option>
                      <option value="LOST">LOST</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: 12, borderRadius: 12, background: '#12223a', border: '1px solid #17314c' }}>
                      <div style={{ color: '#8aa0bf', fontSize: 12, marginBottom: 6 }}>Oda</div>
                      <div style={{ color: '#f4f7fb', fontWeight: 600 }}>{selectedListing.roomCount || '-'}</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: '#12223a', border: '1px solid #17314c' }}>
                      <div style={{ color: '#8aa0bf', fontSize: 12, marginBottom: 6 }}>Brüt m²</div>
                      <div style={{ color: '#f4f7fb', fontWeight: 600 }}>{selectedListing.grossAreaM2 ?? '-'}</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: '#12223a', border: '1px solid #17314c' }}>
                      <div style={{ color: '#8aa0bf', fontSize: 12, marginBottom: 6 }}>Bot eşleşmesi</div>
                      <div style={{ color: '#f4f7fb', fontWeight: 600 }}>{selectedListing.matches.length}</div>
                    </div>
                    <a href={selectedListing.canonicalUrl} target="_blank" rel="noreferrer" style={{ padding: 12, borderRadius: 12, background: '#12223a', border: '1px solid #17314c', color: '#7dd3fc', textDecoration: 'none', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      Kaynak ilanı aç
                    </a>
                  </div>

                  {selectedListing.description ? (
                    <div style={{ padding: 14, borderRadius: 14, background: '#12223a', color: '#c9d5e6', lineHeight: 1.7 }}>
                      {selectedListing.description}
                    </div>
                  ) : null}

                  <form onSubmit={handleCreateNote} style={{ display: 'grid', gap: 10 }}>
                    <textarea
                      value={noteBody}
                      onChange={(event) => setNoteBody(event.target.value)}
                      placeholder="Bu ilanla ilgili not ekleyin"
                      style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }}
                    />
                    <button type="submit" style={{ padding: '12px 14px', borderRadius: 12, border: 0, background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                      Not ekle
                    </button>
                  </form>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <strong>Notlar</strong>
                    {selectedListing.notes.length === 0 ? <div style={{ color: '#8aa0bf' }}>Henüz not yok.</div> : null}
                    {selectedListing.notes.map((note) => (
                      <div key={note.id} style={{ padding: 12, borderRadius: 12, background: '#12223a' }}>
                        <div style={{ color: '#c9d5e6', lineHeight: 1.6 }}>{note.body}</div>
                        <div style={{ color: '#8aa0bf', marginTop: 8, fontSize: 12 }}>{new Date(note.createdAt).toLocaleString('tr-TR')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        </>
      )}
    </main>
  );
}
