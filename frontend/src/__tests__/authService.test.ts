import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../services/authService.ts';
import { storage } from '../utils/storage.ts';

// In-memory mock for localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock API request
vi.mock('../services/api.ts', () => ({
  request: vi.fn(async (url: string) => {
    if (url === '/auth/login') {
      return {
        access_token: 'mock_jwt_token_header_payload_signature',
        token_type: 'bearer',
        expires_in: 86400,
        user: {
          id: 1,
          name: 'Jane Admin',
          email: 'admin@streamops.io',
          role: 'ADMIN'
        }
      };
    }
    if (url === '/auth/register') {
      return {
        id: 2,
        name: 'New User',
        email: 'user@streamops.io',
        role: 'USER'
      };
    }
    if (url === '/auth/me') {
      return {
        id: 1,
        name: 'Jane Admin',
        email: 'admin@streamops.io',
        role: 'ADMIN'
      };
    }
    return {};
  })
}));

describe('Frontend Authentication & Token Management', () => {
  beforeEach(() => {
    storage.clearToken();
  });

  it('stores JWT token and user info upon successful login', async () => {
    const res = await authService.login({
      email: 'admin@streamops.io',
      password: 'SecurePassword123!'
    });

    expect(res.access_token).toBe('mock_jwt_token_header_payload_signature');
    expect(res.user.role).toBe('ADMIN');

    expect(storage.getToken()).toBe('mock_jwt_token_header_payload_signature');
    expect(storage.getUser()).toEqual(res.user);
  });

  it('clears credentials from local storage upon logout', () => {
    storage.setToken('temporary_token');
    storage.setUser({ id: 1, name: 'Test', email: 'test@streamops.io', role: 'USER' });

    expect(storage.getToken()).toBe('temporary_token');
    authService.logout();

    expect(storage.getToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
  });

  it('retrieves current authenticated user profile', async () => {
    const user = await authService.getCurrentUser();
    expect(user.email).toBe('admin@streamops.io');
    expect(user.role).toBe('ADMIN');
  });
});
