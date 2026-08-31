import React, { useState, useEffect } from 'react';

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return 'st';
    case 2:  return 'nd';
    case 3:  return 'rd';
    default: return 'th';
  }
}

export default function DateHUD({ autoScheduleTime = "21:00" }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Date breakdown
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayName = daysOfWeek[now.getDay()];
  const dateNum = now.getDate();
  const ordinal = getOrdinalSuffix(dateNum);
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();

  // Time String (12-hour format with AM/PM)
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const pad = (n) => String(n).padStart(2, '0');

  const timeString = `${displayHours}:${pad(minutes)}:${pad(seconds)} ${ampm}`;

  // Day Shift / Time of day greeting badge
  let shiftLabel = '☀️ Morning Kickoff';
  let shiftColor = '#f59e0b'; // Amber
  if (hours >= 12 && hours < 17) {
    shiftLabel = '🔥 Afternoon Grind';
    shiftColor = '#f97316';
  } else if (hours >= 17 && hours < 22) {
    shiftLabel = '🎯 Evening Deadline Sprint';
    shiftColor = '#ec4899';
  } else if (hours >= 22 || hours < 5) {
    shiftLabel = '⚡ Night Owl Focus Mode';
    shiftColor = '#a855f7';
  }

  // 9:00 PM (or Auto-Schedule time) Countdown
  const [targetH, targetM] = (autoScheduleTime || '21:00').split(':').map(Number);
  const targetDate = new Date(now);
  targetDate.setHours(targetH, targetM, 0, 0);

  const diffMs = targetDate - now;
  let deadlineText = '';
  let isDeadlineUrgent = false;

  if (diffMs > 0) {
    const diffMinsTotal = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinsTotal / 60);
    const diffMins = diffMinsTotal % 60;
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    if (diffHours > 0) {
      deadlineText = `⏳ ${diffHours}h ${diffMins}m until ${autoScheduleTime || '9:00 PM'} Mentor Report`;
    } else {
      deadlineText = `🚨 ${diffMins}m ${diffSecs}s UNTIL MENTOR REPORT DEADLINE!`;
      isDeadlineUrgent = true;
    }
  } else {
    deadlineText = `✅ Today's Mentor Deadline Passed (${autoScheduleTime || '9:00 PM'})`;
  }

  // Day Progress Percentage (24h)
  const secondsPassedInDay = hours * 3600 + minutes * 60 + seconds;
  const dayProgressPercent = Math.min(100, Math.max(0, Math.round((secondsPassedInDay / 86400) * 100)));

  return (
    <div className="cyber-date-hud">
      <div className="hud-content">
        {/* Day & Ordinal Date Badge */}
        <div className="hud-pill date-pill" title="Current Day & Calendar Date">
          <span className="hud-icon">📅</span>
          <div className="date-info">
            <span className="day-name">{dayName}</span>
            <span className="date-details">{dateNum}<sup className="ordinal-sup">{ordinal}</sup> {monthName} {year}</span>
          </div>
        </div>

        {/* Dynamic Shift Greeting */}
        <div className="hud-pill shift-pill" style={{ borderColor: shiftColor, color: shiftColor }}>
          <span className="shift-text">{shiftLabel}</span>
        </div>

        {/* Live Clock with Pulsing Colon */}
        <div className="hud-pill clock-pill" title="Live System Time">
          <span className="hud-icon live-pulse">⏱️</span>
          <span className="live-clock-text">{timeString}</span>
        </div>

        {/* Mentor Deadline Countdown */}
        <div className={`hud-pill countdown-pill ${isDeadlineUrgent ? 'urgent-glow' : ''}`} title="Target Mentor Daily Status Submission Cutoff">
          <span>{deadlineText}</span>
        </div>
      </div>

      {/* Day Progress Meter */}
      <div className="hud-progress-container" title={`Day Progress: ${dayProgressPercent}% elapsed today`}>
        <div className="hud-progress-bar" style={{ width: `${dayProgressPercent}%` }}></div>
        <span className="hud-progress-label">{dayProgressPercent}% of {dayName} Completed</span>
      </div>
    </div>
  );
}
