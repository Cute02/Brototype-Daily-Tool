import React from 'react';

export default function Header({ user, currentTheme, onThemeChange, onOpenAuthModal, onLogout, onOpenPdfModal, onOpenEmailModal }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="logo-icon">✨</div>
        <div>
          <h1>Brototype Daily Task Dashboard</h1>
          <p className="subtitle">Track topics, focus sessions, and mentor updates effortlessly</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Theme Switcher Select */}
        <div className="theme-selector-wrapper">
          <select
            className="select-sm theme-select"
            value={currentTheme}
            onChange={(e) => onThemeChange(e.target.value)}
            title="Choose UI Theme Palette"
          >
            <option value="ember">🎃 Ember Copper Cyber</option>
            <option value="purple">🔮 Solo Leveling Neon</option>
            <option value="cyan">⚡ Matrix Sci-Fi Cyan</option>
            <option value="blue">🌌 Midnight Ocean Blue</option>
          </select>
        </div>

        <button className="btn btn-secondary btn-glow" onClick={onOpenPdfModal}>
          📂 PDF/Drive Importer
        </button>
        <button className="btn btn-secondary" onClick={onOpenEmailModal}>
          📧 Mentor Report
        </button>

        {user ? (
          <div className="user-badge">
            <span>👤 {user}</span>
            <button className="btn btn-sm btn-secondary" style={{ marginLeft: '6px' }} onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => onOpenAuthModal('login')}>
            🔐 Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
}
