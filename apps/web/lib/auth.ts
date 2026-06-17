// JWT stored in a readable cookie so middleware (server) can gate routes and
// the API client (browser) can attach the Bearer header.

export const TOKEN_COOKIE = "token";
const MAX_AGE = 60 * 60 * 24; // 1 day, matches API JWT_EXPIRES_IN

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string): void {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

export function clearToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
