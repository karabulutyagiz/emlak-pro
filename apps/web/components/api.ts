export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type SessionPayload = {
  token: string;
  expiresAt: string;
};

export type AuthPayload = {
  user: {
    id: string;
    publicId: string;
    email: string;
    displayName: string;
    createdAt: string;
  };
  session: SessionPayload;
};

export type BotPayload = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  roomCount: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  isActive: boolean;
  createdAt: string;
};

export type ListingPayload = {
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

export type ListingDetailPayload = {
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

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  token?: string | null;
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
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
    throw new Error(payload?.message || 'Istek basarisiz oldu.');
  }

  return payload?.data as T;
}
