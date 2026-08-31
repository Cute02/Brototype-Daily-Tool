import React from 'react';

export default function Header({
  user,
  currentTheme,
  onThemeChange,
  onOpenAuthModal,
  onLogout,
  onOpenPdfModal,
  onOpenEmailModal,
  autoScheduleEnabled,
  autoScheduleTime,
  onToggleAutoSchedule,
  onChangeAutoScheduleTime,
}) {
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
        {/* Auto-Schedule Controls */}
        <div className="auto-schedule-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0, fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={autoScheduleEnabled}
              onChange={(e) => onToggleAutoSchedule(e.target.checked)}
              title="Enable daily auto-scheduled task report & queue clearing"
            />
            <span>⏰ Auto-Schedule:</span>
          </label>
          <input
            type="time"
            value={autoScheduleTime}
            disabled={!autoScheduleEnabled}
            onChange={(e) => onChangeAutoScheduleTime(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: 'inherit', borderRadius: '4px', padding: '2px 6px', fontSize: '0.85rem' }}
            title="Scheduled daily report dispatch & queue clearing time"
          />
        </div>

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
