'use client';

import { useState } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthFormProps {
  onLogin: (user: User, token: string) => void;
}

export default function AuthForm({ onLogin }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      onLogin(data.user, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Enter Your Email</h2>
      <p style={{ marginBottom: '20px', color: '#6c757d', textAlign: 'center' }}>
        Just enter your email to start asking questions about home loans
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Please wait...' : 'Start Chatting'}
        </button>
      </form>
    </div>
  );
}