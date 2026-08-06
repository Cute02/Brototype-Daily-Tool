import React, { useState } from 'react';

export default function AuthModal({ isOpen, initialTab = 'login', onClose, onLogin, onRegister, onRequestOtp, onVerifyOtp }) {
  const [tab, setTab] = useState(initialTab);
  const [authMode, setAuthMode] = useState('password');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tab === 'login') {
      if (authMode === 'otp') {
        onVerifyOtp(username, otp);
      } else {
        onLogin(username, password);
      }
    } else {
      onRegister(username, password, email);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{tab === 'login' ? '🔐 Sign In to Brototype Tasks' : '✨ Create Brototype Account'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#0f172a', padding: '4px', borderRadius: '8px' }}>
          <button
            style={{ flex: 1, padding: '8px', border: 'none', background: tab === 'login' ? '#6366f1' : 'transparent', color: 'white', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => setTab('login')}
          >
            Sign In
          </button>
          <button
            style={{ flex: 1, padding: '8px', border: 'none', background: tab === 'register' ? '#6366f1' : 'transparent', color: 'white', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => setTab('register')}
          >
            Create Account
          </button>
        </div>

        {tab === 'login' && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            <button
              className={`btn btn-sm ${authMode === 'password' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAuthMode('password')}
            >
              🔑 Password
            </button>
            <button
              className={`btn btn-sm ${authMode === 'otp' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAuthMode('otp')}
            >
              📱 Mobile / Email OTP
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. student123"
              required
            />
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </div>
          )}

          {authMode === 'password' || tab === 'register' ? (
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label>6-Digit OTP Code</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  maxLength="6"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onRequestOtp(username)}
                >
                  📩 Send OTP
                </button>
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {tab === 'login' ? '🚀 Sign In' : '✨ Register Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
