import { Video } from '../types/index.ts';
import { formatDuration, formatDate } from '../utils/formatters.ts';
import { videoService } from '../services/videoService.ts';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
}

export function VideoCard({ video, onSelect }: VideoCardProps) {
  const creatorName = video.creator?.name || 'Creator';
  const hasThumbnail = Boolean(video.thumbnail_key);

  return (
    <div className="video-card" onClick={() => onSelect(video)} style={{ cursor: 'pointer' }}>
      <div className="video-thumb-wrap">
        {hasThumbnail ? (
          <img
            src={videoService.getThumbnailUrl(video.id)}
            alt={video.title}
            className="video-thumb-img"
            onError={(e) => {
              // Hide broken image on error and show fallback
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.thumb-fallback') as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}

        <div className="thumb-fallback" style={{ display: hasThumbnail ? 'none' : 'flex' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>

        {video.duration > 0 && (
          <span className="video-duration">{formatDuration(video.duration)}</span>
        )}
      </div>

      <div className="video-card-body">
        <h3 className="video-title" title={video.title}>{video.title}</h3>

        <div className="video-meta-row">
          <span>{creatorName}</span>
          <span>•</span>
          <span>{video.views.toLocaleString()} views</span>
          <span>•</span>
          <span>{formatDate(video.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
