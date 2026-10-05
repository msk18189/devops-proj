import { storage } from '../utils/storage.ts';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = storage.getToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorInfo = data?.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'An unexpected error occurred'
    };
    throw new ApiError(errorInfo.message, errorInfo.code, errorInfo.details);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}
