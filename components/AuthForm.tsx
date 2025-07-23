'use client';

import { useState } from 'react';
import Toast from './Toast';

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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowToast(false);
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
        const errorMessage = data.message || 'Authentication failed';
        
        // Show domain restriction error as toast
        if (errorMessage === 'Your domain is not supported') {
          setToastMessage(errorMessage);
          setShowToast(true);
        } else {
          // Show other errors inline
          setError(errorMessage);
        }
        return;
      }

      onLogin(data.user, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast
        message={toastMessage}
        type="error"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={5000}
      />
      
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
    </>
  );
}