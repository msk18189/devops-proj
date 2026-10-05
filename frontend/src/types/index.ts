export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface Video {
  id: number;
  title: string;
  description: string | null;
  filename: string;
  storage_key: string;
  thumbnail_key: string | null;
  category: string;
  duration: number;
  file_size: number;
  views: number;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    page_size?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
  environment: string;
  version: string;
  database: {
    status: string;
    message?: string;
  };
}
