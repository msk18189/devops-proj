export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface CreatorInfo {
  id: number;
  name: string;
  email: string;
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
  creator?: CreatorInfo | null;
  stream_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoListResult {
  items: Video[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
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

export interface AdminDashboardData {
  authorized_admin: string;
  admin_profile: User;
  metrics: {
    total_users: number;
    total_videos: number;
    total_views: number;
    total_view_events: number;
  };
  system_metrics?: {
    total_users: number;
    total_videos: number;
    total_views: number;
  };
  recent_videos: Video[];
  system_health: {
    database: string;
    database_message: string;
    status: string;
  };
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
