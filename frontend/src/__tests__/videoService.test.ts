import { describe, it, expect, vi, beforeEach } from 'vitest';
import { videoService } from '../services/videoService.ts';

// Mock the core api request module
vi.mock('../services/api.ts', () => ({
  request: vi.fn(async (url: string, options?: RequestInit) => ({
    mockUrl: url,
    mockMethod: options?.method || 'GET'
  })),
  uploadWithProgress: vi.fn(async (url: string, _formData: FormData) => ({
    mockUrl: url,
    success: true
  }))
}));

describe('Frontend Video Service & Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates correct stream and thumbnail endpoints', () => {
    expect(videoService.getStreamUrl(42)).toBe('/api/videos/42/stream');
    expect(videoService.getThumbnailUrl(42)).toBe('/api/videos/42/thumbnail');
  });

  it('assembles query parameters for catalog search, category, and sorting', async () => {
    const res = await videoService.getVideos({
      page: 2,
      pageSize: 15,
      search: 'Kubernetes',
      category: 'DevOps',
      sort: 'popular',
      userId: 5
    });

    const mockRes = res as unknown as { mockUrl: string; mockMethod: string };
    expect(mockRes.mockMethod).toBe('GET');
    expect(mockRes.mockUrl).toContain('/videos?page=2&page_size=15&sort=popular');
    expect(mockRes.mockUrl).toContain('search=Kubernetes');
    expect(mockRes.mockUrl).toContain('category=DevOps');
    expect(mockRes.mockUrl).toContain('user_id=5');
  });

  it('requests video by ID', async () => {
    const res = await videoService.getVideoById(101);
    const mockRes = res as unknown as { mockUrl: string };
    expect(mockRes.mockUrl).toBe('/videos/101');
  });

  it('calls delete endpoint with DELETE HTTP method', async () => {
    const res = await videoService.deleteVideo(88);
    const mockRes = res as unknown as { mockUrl: string; mockMethod: string };
    expect(mockRes.mockUrl).toBe('/videos/88');
    expect(mockRes.mockMethod).toBe('DELETE');
  });

  it('calls view increment endpoint with POST HTTP method', async () => {
    const res = await videoService.recordView(88);
    const mockRes = res as unknown as { mockUrl: string; mockMethod: string };
    expect(mockRes.mockUrl).toBe('/videos/88/view');
    expect(mockRes.mockMethod).toBe('POST');
  });
});
