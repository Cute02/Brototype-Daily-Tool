import React, { useState, useMemo } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getStatusColor(dayData) {
  if (!dayData || dayData.total === 0) return null;
  if (dayData.completed === dayData.total) return 'var(--status-completed, #10b981)';
  if (dayData.blocked > 0) return 'var(--status-blocked, #f43f5e)';
  if (dayData.in_progress > 0) return 'var(--status-in-progress, #f97316)';
  return 'var(--status-pending, #38bdf8)';
}

export default function TaskCalendar({ tasks, selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayKey = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Build calendar data from tasks
  const calendarData = useMemo(() => {
    const data = {};
    (tasks || []).forEach((task) => {
      const dateKey = task.scheduled_date || (task.created_at ? task.created_at.slice(0, 10) : '');
      if (!dateKey) return;
      if (!data[dateKey]) {
        data[dateKey] = { total: 0, completed: 0, in_progress: 0, pending: 0, blocked: 0 };
      }
      data[dateKey].total += 1;
      if (task.status === 'Completed') data[dateKey].completed += 1;
      else if (task.status === 'In Progress') data[dateKey].in_progress += 1;
      else if (task.status === 'Blocked') data[dateKey].blocked += 1;
      else data[dateKey].pending += 1;
    });
    return data;
  }, [tasks]);

  // Calendar grid generation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const key = getDateKey(prevYear, prevMonth, day);
    calendarCells.push({ day, key, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = getDateKey(viewYear, viewMonth, d);
    calendarCells.push({ day: d, key, isCurrentMonth: true });
  }

  // Next month leading days (fill to 42 cells = 6 rows)
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const key = getDateKey(nextYear, nextMonth, d);
    calendarCells.push({ day: d, key, isCurrentMonth: false });
  }

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const goNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDate(null);
  };

  return (
    <div className="card task-calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={goPrev} title="Previous Month">◀</button>
        <div className="calendar-title">
          <span className="calendar-month">{MONTH_NAMES[viewMonth]}</span>
          <span className="calendar-year">{viewYear}</span>
        </div>
        <button className="calendar-nav-btn" onClick={goNext} title="Next Month">▶</button>
      </div>

      <button className="calendar-today-btn" onClick={goToday}>
        📅 Today
      </button>

      <div className="calendar-grid">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="calendar-weekday">{wd}</div>
        ))}

        {calendarCells.map((cell, idx) => {
          const dayData = calendarData[cell.key];
          const isToday = cell.key === todayKey;
          const isSelected = selectedDate === cell.key;
          const statusColor = getStatusColor(dayData);

          return (
            <div
              key={idx}
              className={[
                'calendar-day',
                !cell.isCurrentMonth && 'calendar-day-outside',
                isToday && 'calendar-day-today',
                isSelected && 'calendar-day-selected',
                dayData && dayData.total > 0 && 'calendar-day-has-tasks',
              ].filter(Boolean).join(' ')}
              onClick={() => cell.isCurrentMonth && onSelectDate(isSelected ? null : cell.key)}
              title={dayData ? `${dayData.total} task${dayData.total !== 1 ? 's' : ''} (${dayData.completed} done)` : ''}
            >
              <span className="calendar-day-number">{cell.day}</span>
              {dayData && dayData.total > 0 && (
                <div className="calendar-day-badge" style={{ '--badge-color': statusColor }}>
                  {dayData.total}
                </div>
              )}
              {dayData && dayData.total > 0 && (
                <div className="calendar-day-dots">
                  {dayData.completed > 0 && <span className="cal-dot cal-dot-completed" />}
                  {dayData.in_progress > 0 && <span className="cal-dot cal-dot-inprogress" />}
                  {dayData.pending > 0 && <span className="cal-dot cal-dot-pending" />}
                  {dayData.blocked > 0 && <span className="cal-dot cal-dot-blocked" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="calendar-selected-info">
          <span>📆 Showing tasks for <strong>{selectedDate}</strong></span>
          <button className="btn btn-sm btn-secondary" onClick={() => onSelectDate(null)}>✕ Clear</button>
        </div>
      )}
    </div>
  );
}
