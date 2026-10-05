import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';

interface RegisterPageProps {
  onSuccess: () => void;
  onNavigateLogin: () => void;
}

export function RegisterPage({ onSuccess, onNavigateLogin }: RegisterPageProps) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-card">
      <h2 className="form-title">Create Account</h2>
      <p className="form-subtitle">Register to unlock video streaming & analytics</p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            type="text"
            className="form-input"
            required
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            required
            placeholder="ada@streamops.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password (min 8 chars)</label>
          <input
            id="reg-password"
            type="password"
            className="form-input"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Registering...' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <button
          onClick={onNavigateLogin}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer' }}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
