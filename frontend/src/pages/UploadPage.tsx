import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { videoService } from '../services/videoService.ts';
import { Video } from '../types/index.ts';
import { formatFileSize } from '../utils/formatters.ts';

interface UploadPageProps {
  onSuccess: (video: Video) => void;
  onNavigateLogin: () => void;
}

export function UploadPage({ onSuccess, onNavigateLogin }: UploadPageProps) {
  const { user } = useAuth();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Technology');

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedVideo, setUploadedVideo] = useState<Video | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Technology',
    'Education',
    'Entertainment',
    'Gaming',
    'Science',
    'Travel',
    'Music',
    'Documentary',
    'DevOps'
  ];

  if (!user) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Authentication Required</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Please sign in to upload video media to the MinIO cluster.
        </p>
        <button onClick={onNavigateLogin} className="btn btn-primary">
          Sign In Now
        </button>
      </div>
    );
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.mp4', '.webm', '.mov', '.mkv'];

    if (!allowed.includes(ext)) {
      setErrorMessage(`Unsupported format '${ext}'. Allowed: .mp4, .webm, .mov, .mkv`);
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrorMessage('File size exceeds 500MB maximum limit');
      return;
    }

    setVideoFile(file);
    if (!title) {
      // Auto-populate title from filename
      const defaultTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(defaultTitle.replace(/[_-]/g, ' '));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setErrorMessage('Please select a video file to upload');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Title is required');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title.trim());
    if (description.trim()) {
      formData.append('description', description.trim());
    }
    formData.append('category', category);
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    try {
      const created = await videoService.uploadVideo(formData, (percent) => {
        setUploadProgress(percent);
      });

      setUploadedVideo(created);
      setIsUploading(false);
    } catch (err: unknown) {
      setIsUploading(false);
      setUploadProgress(null);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to upload video to storage.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem 0 5rem 0', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
        Upload Video
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Store video streams in S3-compatible MinIO object storage with PostgreSQL metadata persistence.
      </p>

      {/* Success Banner */}
      {uploadedVideo ? (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
            Upload completed successfully!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            "{uploadedVideo.title}" is now available in the streaming catalog.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              onClick={() => onSuccess(uploadedVideo)}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem' }}
            >
              Watch Video
            </button>
            <button
              onClick={() => {
                setUploadedVideo(null);
                setVideoFile(null);
                setThumbnailFile(null);
                setTitle('');
                setDescription('');
                setUploadProgress(null);
              }}
              className="btn btn-secondary"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : (
        /* Upload Form */
        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1.25rem',
              color: '#F87171',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {errorMessage}
            </div>
          )}

          {/* Drag & Drop Dropzone */}
          <div
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: '1.5rem' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.mov,.mkv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {videoFile ? (
              <div>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" style={{ margin: '0 auto 0.75rem auto' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{videoFile.name}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Size: {formatFileSize(videoFile.size)} • Click to replace
                </p>
              </div>
            ) : (
              <div>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" style={{ margin: '0 auto 1rem auto' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                  Drag & Drop video file here, or <span style={{ color: 'var(--accent-primary)' }}>browse</span>
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  MP4, WebM, MOV, MKV up to 500MB
                </p>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Video Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Distributed Database Replication & Consensus"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                placeholder="Provide details about video contents, timestamps, or topic overview..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isUploading}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Custom Thumbnail (Optional)</label>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setThumbnailFile(e.target.files[0]);
                    }
                  }}
                  className="form-control"
                  style={{ padding: '0.45rem' }}
                  disabled={isUploading}
                />
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && uploadProgress !== null && (
              <div style={{
                marginTop: '1rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <span>Uploading to MinIO Object Storage...</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{uploadProgress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
              disabled={isUploading || !videoFile}
            >
              {isUploading ? `Uploading (${uploadProgress ?? 0}%)...` : 'Upload Video to Storage'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
