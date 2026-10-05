import { Video } from '../types/index.ts';
import { formatDuration, formatDate } from '../utils/formatters.ts';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
}

export function VideoCard({ video, onSelect }: VideoCardProps) {
  return (
    <div className="card" onClick={() => onSelect(video)} style={{ cursor: 'pointer' }}>
      <div className="card-thumb">
        <div className="card-thumb-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <span className="card-duration">{formatDuration(video.duration)}</span>
      </div>

      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-indigo">{video.category || 'General'}</span>
        </div>

        <h3 className="card-title">{video.title}</h3>

        <div className="card-meta">
          <span>{video.views.toLocaleString()} views</span>
          <span>•</span>
          <span>{formatDate(video.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
