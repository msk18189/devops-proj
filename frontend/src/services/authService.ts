import { request } from './api.ts';
import { AuthTokens, User } from '../types/index.ts';
import { storage } from '../utils/storage.ts';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<User> {
    return request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async login(payload: LoginPayload): Promise<AuthTokens> {
    const data = await request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    storage.setToken(data.access_token);
    storage.setUser(data.user);
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const user = await request<User>('/auth/me');
    storage.setUser(user);
    return user;
  },

  logout(): void {
    storage.clearToken();
  }
};
