import { useState, useRef, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { videoService } from '../services/videoService.ts';

interface VideoPlayerProps {
  video: Video;
  onViewIncremented?: (newViews: number) => void;
}

export function VideoPlayer({ video, onViewIncremented }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const viewRecordedRef = useRef<boolean>(false);

  const streamSrc = videoService.getStreamUrl(video.id);

  useEffect(() => {
    // Reset state on video change
    setIsPlaying(false);
    setIsBuffering(true);
    setHasError(false);
    viewRecordedRef.current = false;
  }, [video.id]);

  const handleTimeUpdate = () => {
    // Record view once user watches past 3 seconds (or when playback starts)
    if (!viewRecordedRef.current && videoRef.current && videoRef.current.currentTime > 2) {
      viewRecordedRef.current = true;
      videoService.recordView(video.id)
        .then(res => {
          if (onViewIncremented) {
            onViewIncremented(res.views);
          }
        })
        .catch(err => console.warn('Could not record view:', err));
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsBuffering(false);
    setErrorMessage('Failed to stream video. Please check your network or try again.');
  };

  const handleRetry = () => {
    setHasError(false);
    setIsBuffering(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="player-container">
      {hasError ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#0F1420'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" style={{ marginBottom: '1rem' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Stream Unavailable</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{errorMessage}</p>
          <button onClick={handleRetry} className="btn btn-secondary">
            Retry Playback
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={streamSrc}
            controls
            playsInline
            data-playing={isPlaying}
            aria-label={isPlaying ? 'Playing stream' : 'Paused stream'}
            className="video-element"
            onPlay={handlePlay}
            onPause={handlePause}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
            onTimeUpdate={handleTimeUpdate}
            onError={handleError}
          />

          {isBuffering && !hasError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                border: '3px solid rgba(255,255,255,0.2)',
                borderTopColor: 'var(--accent-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </>
      )}
    </div>
  );
}
