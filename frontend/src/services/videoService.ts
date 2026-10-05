import { request } from './api.ts';
import { Video } from '../types/index.ts';

export const videoService = {
  async getVideos(page: number = 1, pageSize: number = 12, category?: string): Promise<Video[]> {
    let url = `/videos?page=${page}&page_size=${pageSize}`;
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    return request<Video[]>(url);
  },

  async getVideoById(id: number | string): Promise<Video> {
    return request<Video>(`/videos/${id}`);
  }
};
