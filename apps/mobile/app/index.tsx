import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const SESSION_TOKEN_KEY = 'webico-emlak-session-token';
const USER_KEY = 'webico-emlak-user';

type AuthPayload = {
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

type BotPayload = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  roomCount: string | null;
  isActive: boolean;
  minPrice: number | null;
  maxPrice: number | null;
};

type ListingPayload = {
  id: string;
  title: string;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  price: number | null;
  currency: string | null;
  lifecycle: string;
  matches: Array<{
    botId: string;
    userId: string;
    matchedAt: string;
  }>;
  states: Array<{
    isFavorite: boolean;
    status: string;
    lastViewedAt: string | null;
  }>;
};

type ListingDetailPayload = {
  id: string;
  title: string;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  price: number | null;
  currency: string | null;
  roomCount: string | null;
  grossAreaM2: number | null;
  description: string | null;
  canonicalUrl: string;
  primaryImageUrl: string | null;
  mediaUrls: string[];
  lifecycle: string;
  matches: Array<{
    botId: string;
    matchedAt: string;
  }>;
  states: Array<{
    id: string;
    isFavorite: boolean;
    status: string;
    lastViewedAt: string | null;
  }>;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
};

type StoredUser = {
  id: string;
  publicId: string;
  email: string;
  displayName: string;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  token?: string | null;
  body?: unknown;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as { data?: T; message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || 'İstek başarısız oldu.');
  }

  return payload?.data as T;
}

function formatPrice(price?: number | null, currency?: string | null) {
  if (typeof price !== 'number') {
    return 'Fiyat bilgisi yok';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

function BrandMark() {
  return (
    <View style={styles.brandMark}>
      <View style={styles.brandBarLeft} />
      <View style={styles.brandBarRight} />
    </View>
  );
}

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [bots, setBots] = useState<BotPayload[]>([]);
  const [listings, setListings] = useState<ListingPayload[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingDetailPayload | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [feedStatus, setFeedStatus] = useState<'Bağlanıyor' | 'Bağlı' | 'Çevrim dışı'>('Bağlanıyor');

  const stats = useMemo(
    () => [
      { label: 'Aktif bot', value: String(bots.filter((bot) => bot.isActive).length) },
      { label: 'Eşleşen ilan', value: String(listings.length) },
      { label: 'Favori', value: String(listings.filter((listing) => listing.states[0]?.isFavorite).length) },
      { label: 'Kullanıcı ID', value: user?.publicId ?? '-' },
    ],
    [bots, listings, user],
  );

  const selectedState = selectedListing?.states[0] ?? null;

  useEffect(() => {
    void bootstrapSession();
  }, []);

  useEffect(() => {
    if (!token || !selectedListingId) {
      return;
    }

    void loadListingDetail(selectedListingId, token);
  }, [selectedListingId, token]);

  useEffect(() => {
    if (!token) {
      setFeedStatus('Çevrim dışı');
      return;
    }

    setFeedStatus('Bağlanıyor');
    const socket: Socket = io(`${API_URL}/realtime`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setFeedStatus('Bağlı');
      socket.emit('feed.subscribe', { token });
    });

    socket.on('disconnect', () => {
      setFeedStatus('Çevrim dışı');
    });

    socket.on('connect_error', () => {
      setFeedStatus('Çevrim dışı');
    });

    socket.on('listing.created', (payload: { data: ListingPayload }) => {
      setListings((current) => {
        const withoutSame = current.filter((item) => item.id !== payload.data.id);
        return [payload.data, ...withoutSame];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  async function bootstrapSession() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(SESSION_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (!storedToken || !storedUser) {
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser) as StoredUser;
      setToken(storedToken);
      setUser(parsedUser);
      await loadDashboard(storedToken);
    } catch {
      await clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDashboard(sessionToken: string) {
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

      if (selectedListingId && !userListings.some((listing) => listing.id === selectedListingId)) {
        setSelectedListingId(null);
        setSelectedListing(null);
      }
    } catch (loadError) {
      await clearStoredSession();
      setError(loadError instanceof Error ? loadError.message : 'Panel verileri alınamadı.');
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

  async function handleLogin() {
    setIsAuthenticating(true);
    setError(null);

    try {
      const payload = await apiRequest<AuthPayload>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      const nextUser: StoredUser = {
        id: payload.user.id,
        publicId: payload.user.publicId,
        email: payload.user.email,
        displayName: payload.user.displayName,
      };

      await AsyncStorage.multiSet([
        [SESSION_TOKEN_KEY, payload.session.token],
        [USER_KEY, JSON.stringify(nextUser)],
      ]);

      setToken(payload.session.token);
      setUser(nextUser);
      await loadDashboard(payload.session.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Giriş yapılamadı.');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleLogout() {
    await clearStoredSession();
    setEmail('');
    setPassword('');
    setSelectedListing(null);
    setSelectedListingId(null);
    setNoteBody('');
  }

  async function clearStoredSession() {
    await AsyncStorage.multiRemove([SESSION_TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
    setBots([]);
    setListings([]);
    setSelectedListing(null);
    setSelectedListingId(null);
  }

  async function handleUpdateListingState(nextState: { isFavorite?: boolean; status?: string }) {
    if (!token || !selectedListingId) {
      return;
    }

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

  async function handleCreateNote() {
    if (!token || !selectedListingId || !noteBody.trim()) {
      return;
    }

    try {
      await apiRequest(`/listings/${selectedListingId}/notes`, {
        method: 'POST',
        token,
        body: { body: noteBody.trim() },
      });

      setNoteBody('');
      await loadListingDetail(selectedListingId, token);
    } catch (noteError) {
      setDetailError(noteError instanceof Error ? noteError.message : 'Not eklenemedi.');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Webico EMLAK yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.authScrollContent}>
          <View style={styles.authHero}>
            <View style={styles.heroBadge}>
              <BrandMark />
              <Text style={styles.heroBadgeText}>Webico EMLAK</Text>
            </View>
            <Text style={styles.heroTitle}>İlan akışını anında yönetin</Text>
            <Text style={styles.heroDescription}>Operasyon paneline giriş yapın.</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Giriş yapın</Text>
            <Text style={styles.authSubtitle}>Hesabınıza erişin.</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-posta adresi"
              placeholderTextColor="#6f86a5"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Şifre"
              placeholderTextColor="#6f86a5"
              secureTextEntry
              style={styles.input}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.primaryButton} onPress={() => void handleLogin()}>
              <Text style={styles.primaryButtonText}>{isAuthenticating ? 'Giriş yapılıyor...' : 'Panele giriş yap'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.dashboardContent}>
        <View style={styles.headerCard}>
          <View style={styles.heroBadge}>
            <BrandMark />
            <Text style={styles.heroBadgeText}>Webico EMLAK</Text>
          </View>
          <Text style={styles.heroTitle}>Mobil operasyon paneli</Text>
          <Text style={styles.heroDescription}>Canlı akışı izleyin ve ilanları yönetin.</Text>

          <View style={styles.sessionCard}>
            <View>
              <Text style={styles.sessionName}>{user.displayName}</Text>
              <Text style={styles.sessionMeta}>{user.email}</Text>
              <Text style={styles.sessionMeta}>Kullanıcı ID: {user.publicId}</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => void handleLogout()}>
              <Text style={styles.secondaryButtonText}>Çıkış yap</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.liveFeedHeader}>
          <Text style={styles.sectionTitle}>Canlı akış</Text>
          <View style={[styles.feedBadge, feedStatus === 'Bağlı' ? styles.feedBadgeOnline : styles.feedBadgeOffline]}>
            <Text style={styles.feedBadgeText}>{feedStatus}</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Botlar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.botRow}>
          {bots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Henüz bot tanımlı değil.</Text>
            </View>
          ) : null}
          {bots.map((bot) => (
            <View key={bot.id} style={styles.botCard}>
              <Text style={styles.botName}>{bot.name}</Text>
              <Text style={styles.botMeta}>{[bot.city, bot.district, bot.neighborhood].filter(Boolean).join(' / ') || 'Bölge tanımsız'}</Text>
              <Text style={styles.botMeta}>Oda: {bot.roomCount || '-'}</Text>
            </View>
          ))}
          </ScrollView>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Eşleşen ilanlar</Text>
          {listings.length === 0 ? <Text style={styles.emptyText}>Henüz eşleşen ilan yok.</Text> : null}
          {listings.map((listing) => (
            <Pressable
              key={listing.id}
              onPress={() => setSelectedListingId(listing.id)}
              style={[styles.listingCard, selectedListingId === listing.id ? styles.listingCardActive : null]}
            >
              <View style={styles.listingTopRow}>
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <Text style={styles.listingPrice}>{formatPrice(listing.price, listing.currency)}</Text>
              </View>
              <Text style={styles.listingMeta}>{[listing.city, listing.district, listing.neighborhood].filter(Boolean).join(' / ') || 'Konum bilgisi yok'}</Text>
              <View style={styles.tagRow}>
                <Text style={styles.tag}>{listing.lifecycle}</Text>
                <Text style={styles.tag}>Eşleşme: {listing.matches.length}</Text>
                <Text style={styles.tag}>Durum: {listing.states[0]?.status ?? 'NEW'}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>İlan detayı</Text>
          {!selectedListingId ? <Text style={styles.emptyText}>Detay görmek için bir ilan seçin.</Text> : null}
          {isDetailLoading ? <ActivityIndicator size="small" color="#7c3aed" /> : null}
          {detailError ? <Text style={styles.errorText}>{detailError}</Text> : null}

          {selectedListing ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>{selectedListing.title}</Text>
              <Text style={styles.detailMeta}>{[selectedListing.city, selectedListing.district, selectedListing.neighborhood].filter(Boolean).join(' / ') || 'Konum bilgisi yok'}</Text>
              <Text style={styles.detailPrice}>{formatPrice(selectedListing.price, selectedListing.currency)}</Text>

              <View style={styles.tagRow}>
                <Text style={styles.tag}>{selectedListing.lifecycle}</Text>
                <Text style={styles.tag}>Durum: {selectedState?.status ?? 'NEW'}</Text>
                <Text style={styles.tag}>{selectedState?.isFavorite ? 'Favori' : 'Normal'}</Text>
              </View>

              <View style={styles.actionGrid}>
                <Pressable style={styles.secondaryButton} onPress={() => void handleUpdateListingState({ isFavorite: !selectedState?.isFavorite })}>
                  <Text style={styles.secondaryButtonText}>{selectedState?.isFavorite ? 'Favoriden çıkar' : 'Favoriye al'}</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleUpdateListingState({ status: 'TO_CALL' })}>
                  <Text style={styles.secondaryButtonText}>Aranacak yap</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleUpdateListingState({ status: 'CALLED' })}>
                  <Text style={styles.secondaryButtonText}>Arandı yap</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleUpdateListingState({ status: 'SUITABLE' })}>
                  <Text style={styles.secondaryButtonText}>Uygun işaretle</Text>
                </Pressable>
              </View>

              <View style={styles.detailInfoBox}>
                <Text style={styles.detailInfoText}>Oda sayısı: {selectedListing.roomCount || '-'}</Text>
                <Text style={styles.detailInfoText}>Brüt m²: {selectedListing.grossAreaM2 ?? '-'}</Text>
                <Text style={styles.detailInfoText}>Bot eşleşmesi: {selectedListing.matches.length}</Text>
              </View>

              {selectedListing.description ? <Text style={styles.descriptionText}>{selectedListing.description}</Text> : null}

              <Pressable style={styles.linkButton} onPress={() => void Linking.openURL(selectedListing.canonicalUrl)}>
                <Text style={styles.linkButtonText}>Kaynak ilanı aç</Text>
              </Pressable>

              <TextInput
                value={noteBody}
                onChangeText={setNoteBody}
                placeholder="Bu ilanla ilgili not ekleyin"
                placeholderTextColor="#6f86a5"
                multiline
                style={styles.noteInput}
              />
              <Pressable style={styles.primaryButton} onPress={() => void handleCreateNote()}>
                <Text style={styles.primaryButtonText}>Not ekle</Text>
              </Pressable>

              <View style={styles.notesBlock}>
                <Text style={styles.notesTitle}>Notlar</Text>
                {selectedListing.notes.length === 0 ? <Text style={styles.emptyText}>Henüz not yok.</Text> : null}
                {selectedListing.notes.map((note) => (
                  <View key={note.id} style={styles.noteCard}>
                    <Text style={styles.noteBody}>{note.body}</Text>
                    <Text style={styles.noteDate}>{new Date(note.createdAt).toLocaleString('tr-TR')}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#c3d2e6',
    fontSize: 15,
  },
  authScrollContent: {
    padding: 20,
    gap: 18,
  },
  authHero: {
    paddingTop: 12,
    gap: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroBadgeText: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#f4f7fb',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  heroDescription: {
    color: '#9cb0ca',
    lineHeight: 24,
    fontSize: 15,
  },
  authCard: {
    backgroundColor: '#0f1b2d',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1d334c',
    gap: 14,
  },
  authTitle: {
    color: '#f4f7fb',
    fontSize: 24,
    fontWeight: '700',
  },
  authSubtitle: {
    color: '#92a7c4',
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#0b1726',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b435f',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f4f7fb',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#294160',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 23, 38, 0.85)',
  },
  secondaryButtonText: {
    color: '#d5e4f5',
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    color: '#ff9e9e',
    lineHeight: 20,
  },
  dashboardContent: {
    padding: 16,
    gap: 16,
  },
  headerCard: {
    backgroundColor: '#0f1b2d',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d334c',
    gap: 12,
  },
  sessionCard: {
    marginTop: 6,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#12223a',
    gap: 12,
  },
  sessionName: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 17,
  },
  sessionMeta: {
    color: '#91a8c6',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#0f1b2d',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d334c',
  },
  statLabel: {
    color: '#88a0bf',
    fontSize: 13,
    marginBottom: 8,
  },
  statValue: {
    color: '#f4f7fb',
    fontSize: 24,
    fontWeight: '700',
  },
  liveFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  feedBadgeOnline: {
    backgroundColor: '#173624',
  },
  feedBadgeOffline: {
    backgroundColor: '#392416',
  },
  feedBadgeText: {
    color: '#e7f0fa',
    fontSize: 12,
    fontWeight: '700',
  },
  botRow: {
    gap: 12,
    paddingRight: 12,
  },
  botCard: {
    width: 220,
    backgroundColor: '#0f1b2d',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d334c',
  },
  botName: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '700',
  },
  botMeta: {
    color: '#90a6c2',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#0f1b2d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#16314e',
  },
  emptyText: {
    color: '#8ea3bf',
    lineHeight: 20,
  },
  sectionBlock: {
    backgroundColor: '#0f1b2d',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d334c',
    gap: 14,
  },
  sectionTitle: {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: '700',
  },
  listingCard: {
    backgroundColor: '#12223a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a3557',
    gap: 10,
  },
  listingCardActive: {
    backgroundColor: '#173154',
  },
  listingTopRow: {
    gap: 8,
  },
  listingTitle: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 16,
  },
  listingPrice: {
    color: '#dfeaf7',
    fontSize: 15,
  },
  listingMeta: {
    color: '#89a2c0',
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    color: '#d7e5f8',
    fontSize: 12,
    backgroundColor: '#1a3557',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  detailCard: {
    gap: 14,
  },
  detailTitle: {
    color: '#f4f7fb',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  detailMeta: {
    color: '#8ea4bf',
    lineHeight: 20,
  },
  detailPrice: {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailInfoBox: {
    backgroundColor: '#12223a',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  detailInfoText: {
    color: '#d3deec',
  },
  descriptionText: {
    color: '#d0dceb',
    lineHeight: 22,
    backgroundColor: '#12223a',
    borderRadius: 14,
    padding: 14,
  },
  linkButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#132740',
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#7dd3fc',
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    backgroundColor: '#0b1726',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b435f',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f4f7fb',
    fontSize: 15,
  },
  notesBlock: {
    gap: 10,
  },
  notesTitle: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 16,
  },
  noteCard: {
    backgroundColor: '#12223a',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  noteBody: {
    color: '#d3dfec',
    lineHeight: 20,
  },
  noteDate: {
    color: '#8ea4bf',
    fontSize: 12,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandBarLeft: {
    width: 9,
    height: 23,
    borderRadius: 999,
    backgroundColor: '#2563ff',
    transform: [{ rotate: '-20deg' }],
  },
  brandBarRight: {
    width: 9,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#a855f7',
    transform: [{ rotate: '20deg' }, { translateY: 2 }],
  },
});
