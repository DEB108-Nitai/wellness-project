/**
 * Typed fetch wrapper for the PHP API (same origin: /api/*).
 * - Sends the CSRF token on every state-changing request (PRD AUTH-8).
 * - Picks up a fresh token from any response that carries `csrfToken`.
 * - Retries once after refreshing the token if the server reports CSRF_FAILED.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const BASE = '/api';
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

async function refreshCsrfToken(): Promise<void> {
  const data = await request<{ csrfToken: string }>('GET', '/auth/me');
  csrfToken = data.csrfToken;
}

async function request<T>(method: Method, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    if (!csrfToken) await refreshCsrfToken();
    headers['X-CSRF-Token'] = csrfToken ?? '';
  }

  let response: Response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'We could not reach the server. Please check your connection and try again.');
  }

  let json: { ok: boolean; data?: T; error?: { code: string; message: string; fields?: Record<string, string> } };
  try {
    json = await response.json();
  } catch {
    throw new ApiError(response.status, 'BAD_RESPONSE', 'The server sent an unexpected response. Please try again.');
  }

  if (!json.ok || !response.ok) {
    const error = json.error ?? { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
    if (error.code === 'CSRF_FAILED' && retry) {
      await refreshCsrfToken();
      return request<T>(method, path, body, false);
    }
    throw new ApiError(response.status, error.code, error.message, error.fields ?? {});
  }

  const data = json.data as T;
  if (data && typeof data === 'object' && 'csrfToken' in data && typeof (data as { csrfToken: unknown }).csrfToken === 'string') {
    csrfToken = (data as { csrfToken: string }).csrfToken;
  }
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown = {}) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown = {}) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** First field message or the general message — handy for compact error display. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}
