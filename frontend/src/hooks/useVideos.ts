import { useState, useEffect, useCallback } from 'react';
import { Video } from '../types/index.ts';
import { videoService } from '../services/videoService.ts';

export function useVideos(page: number = 1, category?: string) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await videoService.getVideos({
        page,
        pageSize: 12,
        category: category !== 'All' ? category : undefined
      });
      setVideos(res.items);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch videos');
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, isLoading, error, refetch: fetchVideos };
}
