interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 8 }: SkeletonGridProps) {
  return (
    <div className="video-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-thumb" />
          <div style={{ padding: '0.9rem' }}>
            <div style={{
              height: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              marginBottom: '0.6rem',
              width: '85%'
            }} />
            <div style={{
              height: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '4px',
              width: '50%'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
