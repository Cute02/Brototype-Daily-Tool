import React from 'react';

export default function StatsDashboard({ stats }) {
  const s = stats || { total: 0, completed: 0, in_progress: 0, pending: 0, blocked: 0, completion_rate: 0 };
  const is100 = s.total > 0 && s.completed === s.total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="stats-dashboard">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">{s.total}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#10b981' }}>{s.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#f59e0b' }}>{s.in_progress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📌</div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#06b6d4' }}>{s.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🛑</div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#ef4444' }}>{s.blocked}</span>
            <span className="stat-label">Blocked</span>
          </div>
        </div>
      </div>

      {is100 && (
        <div className="milestone-banner">
          🏆 Congratulations! You have completed 100% of your daily study roadmap topics!
        </div>
      )}
    </div>
  );
}
