import React, { useState, useEffect } from 'react';
import { playChime, triggerConfettiBurst } from '../utils/confetti';

const POMO_DURATIONS = {
  work: 1500,
  shortBreak: 300,
  longBreak: 900
};

export default function PomodoroTimer({ tasks, onUpdateTaskStatus, showToast }) {
  const [mode, setMode] = useState('work');
  const [duration, setDuration] = useState(1500);
  const [timeLeft, setTimeLeft] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  useEffect(() => {
    let timerId = null;
    if (isRunning) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev > 1) {
            return prev - 1;
          } else {
            setIsRunning(false);
            playChime();
            triggerConfettiBurst();
            showToast('🎉 Pomodoro Session Completed!', 'success');

            if (selectedTaskId) {
              if (window.confirm("Focus session finished! Mark target task as Completed?")) {
                onUpdateTaskStatus(parseInt(selectedTaskId), 'Completed', 'Completed via Pomodoro Session');
              }
            }
            return duration;
          }
        });
      }, 1000);
    } else {
      clearInterval(timerId);
    }
    return () => clearInterval(timerId);
  }, [isRunning, duration, selectedTaskId, onUpdateTaskStatus, showToast]);

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    const secs = POMO_DURATIONS[newMode] || 1500;
    setDuration(secs);
    setTimeLeft(secs);
  };

  const setCustomMins = (mins) => {
    const secs = mins * 60;
    setIsRunning(false);
    setDuration(secs);
    setTimeLeft(secs);
  };

  const adjustSeconds = (delta) => {
    let newTime = timeLeft + delta;
    if (newTime < 60) newTime = 60;
    if (newTime > 10800) newTime = 10800;
    setDuration(newTime);
    setTimeLeft(newTime);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className={`card pomodoro-card ${isRunning ? 'active-timer' : ''}`}>
      <div className="card-header">
        <h2>🍅 Pomodoro Focus Timer</h2>
      </div>

      <div className="pomo-modes">
        <button
          className={`pomo-mode-btn ${mode === 'work' ? 'active' : ''}`}
          onClick={() => switchMode('work')}
        >
          💻 Work (25m)
        </button>
        <button
          className={`pomo-mode-btn ${mode === 'shortBreak' ? 'active' : ''}`}
          onClick={() => switchMode('shortBreak')}
        >
          ☕ Short (5m)
        </button>
        <button
          className={`pomo-mode-btn ${mode === 'longBreak' ? 'active' : ''}`}
          onClick={() => switchMode('longBreak')}
        >
          🌴 Long (15m)
        </button>
      </div>

      <div className="pomo-timer-options">
        <div className="pomo-select-wrapper">
          <label>Target Task Duration:</label>
          <div className="pomo-adjust-row">
            <button className="btn-adjust" onClick={() => setCustomMins(30)}>30m</button>
            <button className="btn-adjust" onClick={() => setCustomMins(60)}>1h</button>
            <button className="btn-adjust" onClick={() => setCustomMins(120)}>2h</button>
            <button className="btn-adjust" onClick={() => setCustomMins(180)}>3h</button>
          </div>
        </div>

        <div className="pomo-adjust-row">
          <button className="btn-adjust" onClick={() => adjustSeconds(-300)}>-5m</button>
          <button className="btn-adjust" onClick={() => adjustSeconds(-60)}>-1m</button>
          <button className="btn-adjust" onClick={() => adjustSeconds(60)}>+1m</button>
          <button className="btn-adjust" onClick={() => adjustSeconds(300)}>+5m</button>
        </div>
      </div>

      <div className="timer-display">{formattedTime}</div>

      <div className="pomo-task-selector">
        <label>Target Task</label>
        <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
          <option value="">-- Select Active Task --</option>
          {tasks
            .filter((t) => t.status !== 'Completed')
            .map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} {t.title} [{t.priority}]
              </option>
            ))}
        </select>
      </div>

      <div className="pomo-controls">
        <button className={`btn ${isRunning ? 'btn-warning' : 'btn-success'}`} onClick={toggleTimer}>
          {isRunning ? '⏸ Pause' : '▶ Start Focus'}
        </button>
        <button className="btn btn-secondary" onClick={resetTimer}>
          🔄 Reset
        </button>
      </div>
    </div>
  );
}
