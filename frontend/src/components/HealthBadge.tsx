import { useState, useEffect } from 'react';
import { HealthStatus } from '../types/index.ts';

export function HealthBadge() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const json = await res.json();
          setHealth(json.data || json);
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch {
        setIsOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)',
          boxShadow: isOnline ? '0 0 8px #10B981' : '0 0 8px #F43F5E'
        }}
      />
      <span>{isOnline ? (health?.database?.status === 'connected' ? 'API & DB Ready' : 'API Online') : 'API Offline'}</span>
    </div>
  );
}
