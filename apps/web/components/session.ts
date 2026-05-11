const SESSION_TOKEN_KEY = 'webico-emlak-session-token';
const USER_KEY = 'webico-emlak-user';

export type StoredUser = {
  id: string;
  publicId: string;
  email: string;
  displayName: string;
};

export function getSessionToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function saveSession(token: string, user: StoredUser) {
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}
