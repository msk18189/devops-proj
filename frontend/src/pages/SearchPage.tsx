import { useState, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { videoService } from '../services/videoService.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { SkeletonGrid } from '../components/SkeletonGrid.tsx';

interface SearchPageProps {
  onSelectVideo: (video: Video) => void;
}

export function SearchPage({ onSelectVideo }: SearchPageProps) {
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [results, setResults] = useState<Video[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute backend search
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const res = await videoService.getVideos({
          search: debouncedQuery.trim(),
          pageSize: 20
        });
        setResults(res.items || []);
        setTotalCount(res.total || 0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  return (
    <div style={{ padding: '2rem 0 4rem 0', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Search Content</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Find videos by title, description keywords, or category
        </p>

        <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search keywords (e.g. Kubernetes, Observability, DevOps)..."
            style={{
              padding: '0.85rem 1.25rem 0.85rem 3rem',
              fontSize: '1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)'
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth="2"
            style={{ position: 'absolute', left: '1.15rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {/* Results State */}
      {hasSearched && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            {isLoading ? 'Searching...' : `Results for "${debouncedQuery}"`}
          </h2>
          {!isLoading && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {totalCount} {totalCount === 1 ? 'match' : 'matches'} found
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : hasSearched && results.length === 0 ? (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            No results found for "{debouncedQuery}"
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Check spelling, try broader search terms, or explore genres in Browse.
          </p>
        </div>
      ) : (
        <div className="video-grid">
          {results.map((video) => (
            <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
          ))}
        </div>
      )}
    </div>
  );
}
