import { request } from './api.ts';
import { AdminDashboardData, VideoListResult } from '../types/index.ts';

export const adminService = {
  async getDashboardStats(): Promise<AdminDashboardData> {
    return request<AdminDashboardData>('/admin/dashboard-stats');
  },

  async getAdminVideos(page: number = 1, pageSize: number = 20): Promise<VideoListResult> {
    return request<VideoListResult>(`/admin/videos?page=${page}&page_size=${pageSize}`);
  }
};
