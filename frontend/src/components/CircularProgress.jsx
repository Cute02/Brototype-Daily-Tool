import React from 'react';

export default function CircularProgress({ stats }) {
  const completionRate = stats.completion_rate || 0;
  const completed = stats.completed || 0;
  const total = stats.total || 0;

  const radius = 52;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  let progressLabel = 'Keep Going!';
  if (completionRate >= 100 && total > 0) progressLabel = '🎉 All Done!';
  else if (completionRate >= 75) progressLabel = '🔥 Almost There!';
  else if (completionRate >= 50) progressLabel = '⚡ Great Progress!';
  else if (completionRate > 0) progressLabel = '🚀 Getting Started';

  return (
    <div className="card circular-progress-card">
      <div className="card-header" style={{ marginBottom: '12px' }}>
        <h2>🎯 Productivity Goal</h2>
      </div>

      <div className="circle-wrapper">
        <svg className="circle-svg" width="140" height="140" viewBox="0 0 140 140">
          <circle
            className="circle-bg"
            cx="70"
            cy="70"
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="circle-fill"
            cx="70"
            cy="70"
            r={radius}
            strokeWidth={strokeWidth}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        <div className="circle-content">
          <span className="circle-percent">{completionRate}%</span>
          <span className="circle-sublabel">Done</span>
        </div>
      </div>

      <div className="circle-footer-info">
        <span className="badge-progress-text">{progressLabel}</span>
        <span className="circle-stats-count">{completed} of {total} Tasks Completed</span>
      </div>
    </div>
  );
}
