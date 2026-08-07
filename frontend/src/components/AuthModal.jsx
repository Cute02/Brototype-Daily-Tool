import React, { useState } from 'react';

export default function AuthModal({
  isOpen,
  initialTab = 'login',
  onClose,
  onLogin,
  onRegister,
  onRequestOtp,
  onVerifyOtp,
  onRequestReset,
  onResetPassword
}) {
  const [tab, setTab] = useState(initialTab);
  const [authMode, setAuthMode] = useState('password');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [demoResetData, setDemoResetData] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tab === 'login') {
      if (authMode === 'otp') {
        onVerifyOtp(username, otp);
      } else {
        onLogin(username, password);
      }
    } else if (tab === 'register') {
      onRegister(username, password, email);
    } else if (tab === 'forgot') {
      if (onResetPassword) {
        const success = await onResetPassword(forgotIdentifier, forgotCode, newPassword, confirmPassword);
        if (success) {
          setUsername(forgotIdentifier);
          setPassword(newPassword);
          setTab('login');
        }
      }
    }
  };

  const handleRequestResetLink = async () => {
    if (!forgotIdentifier) return;
    if (onRequestReset) {
      const res = await onRequestReset(forgotIdentifier);
      if (res) {
        setDemoResetData(res);
        setForgotStep(2);
      }
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-card">
        <div className="modal-header">
          <h2>
            {tab === 'login' && '🔐 Sign In to Brototype Tasks'}
            {tab === 'register' && '✨ Create Brototype Account'}
            {tab === 'forgot' && '🔑 Reset Your Password'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: '#0f172a', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            style={{ flex: 1, padding: '8px', border: 'none', background: tab === 'login' ? '#6366f1' : 'transparent', color: 'white', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => setTab('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{ flex: 1, padding: '8px', border: 'none', background: tab === 'register' ? '#6366f1' : 'transparent', color: 'white', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => setTab('register')}
          >
            Register
          </button>
          <button
            type="button"
            style={{ flex: 1, padding: '8px', border: 'none', background: tab === 'forgot' ? '#6366f1' : 'transparent', color: 'white', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => setTab('forgot')}
          >
            Forgot Pwd
          </button>
        </div>

        {tab === 'login' && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`btn btn-sm ${authMode === 'password' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAuthMode('password')}
            >
              🔑 Password
            </button>
            <button
              type="button"
              className={`btn btn-sm ${authMode === 'otp' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAuthMode('otp')}
            >
              📱 Mobile / Email OTP
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab !== 'forgot' && (
            <div className="form-group">
              <label>Username or Email *</label>
              <input
                type="text"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. student123"
                autoComplete="username"
                required
              />
            </div>
          )}

          {tab === 'register' && (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                autoComplete="email"
              />
            </div>
          )}

          {tab === 'login' && (
            authMode === 'password' ? (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Password *</label>
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label>6-Digit OTP Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    name="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    maxLength="6"
                    autoComplete="one-time-code"
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
            )
          )}

          {tab === 'register' && (
            <div className="form-group">
              <label>Choose Password *</label>
              <input
                type="password"
                name="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {tab === 'forgot' && (
            <div>
              <div className="form-group">
                <label>Username or Email Address *</label>
                <input
                  type="text"
                  name="username"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Enter registered username or email"
                  autoComplete="username"
                  required
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '12px' }}
                onClick={handleRequestResetLink}
              >
                📩 Send Verification Link & OTP
              </button>

              {demoResetData && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '12px' }}>
                  <div><strong>Demo Verification Details:</strong></div>
                  <div>OTP Code: <strong style={{ color: '#38bdf8' }}>{demoResetData.otp}</strong></div>
                  <div style={{ wordBreak: 'break-all', marginTop: '4px' }}>
                    Token: <span
                      style={{ color: '#a5f3fc', textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => {
                        setForgotCode(demoResetData.reset_token);
                        setForgotStep(2);
                      }}
                    >
                      Auto-fill Verification Token
                    </span>
                  </div>
                </div>
              )}

              {forgotStep === 2 && (
                <>
                  <div className="form-group">
                    <label>OTP Code or Verification Token *</label>
                    <input
                      type="text"
                      name="reset-code"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value)}
                      placeholder="e.g. 123456 or token"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Enter New Password *</label>
                    <input
                      type="password"
                      name="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password *</label>
                    <input
                      type="password"
                      name="confirm-new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {tab === 'login' && '🚀 Sign In'}
              {tab === 'register' && '✨ Register Account'}
              {tab === 'forgot' && '🔒 Reset Password & Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

