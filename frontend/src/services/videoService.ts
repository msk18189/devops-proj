import { request, uploadWithProgress } from './api.ts';
import { Video, VideoListResult } from '../types/index.ts';

export interface VideoQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  sort?: string;
  userId?: number;
}

export const videoService = {
  async getVideos(params: VideoQueryParams = {}): Promise<VideoListResult> {
    const {
      page = 1,
      pageSize = 12,
      search,
      category,
      sort = 'latest',
      userId
    } = params;

    let url = `/videos?page=${page}&page_size=${pageSize}&sort=${sort}`;

    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    if (category && category !== 'All') {
      url += `&category=${encodeURIComponent(category)}`;
    }
    if (userId !== undefined) {
      url += `&user_id=${userId}`;
    }

    return request<VideoListResult>(url);
  },

  async getVideoById(id: number | string): Promise<Video> {
    return request<Video>(`/videos/${id}`);
  },

  async uploadVideo(
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<Video> {
    return uploadWithProgress<Video>('/videos/upload', formData, onProgress);
  },

  async deleteVideo(id: number | string): Promise<{ id: number; deleted: boolean }> {
    return request<{ id: number; deleted: boolean }>(`/videos/${id}`, {
      method: 'DELETE'
    });
  },

  async recordView(id: number | string): Promise<{ video_id: number; views: number }> {
    return request<{ video_id: number; views: number }>(`/videos/${id}/view`, {
      method: 'POST'
    });
  },

  getStreamUrl(id: number | string): string {
    return `/api/videos/${id}/stream`;
  },

  getThumbnailUrl(id: number | string): string {
    return `/api/videos/${id}/thumbnail`;
  }
};
