/* JavaScript Application Logic for Brototype Daily Tool */

// State Management
const state = {
  tasks: [],
  stats: {},
  currentFilter: 'ALL',
  currentSort: 'priority',
  searchQuery: '',
  mentorEmail: localStorage.getItem('mentor_email') || 'mentor@brototype.com',
  // Pomodoro State
  pomo: {
    mode: 'work', // 'work', 'shortBreak', 'longBreak'
    duration: 1500, // 25 mins in seconds
    timeLeft: 1500,
    timerId: null,
    isRunning: false,
    selectedTaskId: null
  }
};

const POMO_DURATIONS = {
  work: 1500,       // 25 mins
  shortBreak: 300,  // 5 mins
  longBreak: 900    // 15 mins
};

// Web Audio Chime Generator
function playChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch (e) {
    console.log("Audio not supported or blocked by browser user gesture.");
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// REST API Methods
async function fetchTasks() {
  try {
    let url = `/api/tasks?sort_by=${state.currentSort}`;
    if (state.currentFilter !== 'ALL') {
      url += `&status=${encodeURIComponent(state.currentFilter)}`;
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load tasks");
    const data = await res.json();
    
    state.tasks = data.tasks;
    state.stats = data.stats;

    renderStats();
    renderTodoList();
    renderPomoTaskSelect();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function addTask(taskData) {
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error("Failed to add task");
    showToast('✓ Task created successfully!', 'success');
    await fetchTasks();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function updateTaskStatus(id, status, notes = null) {
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error("Failed to update status");
    showToast(`✓ Status updated to ${status}`, 'success');
    await fetchTasks();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function updateTaskFullDetails(id, details) {
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    if (!res.ok) throw new Error("Failed to update task");
    showToast('✓ Task updated successfully!', 'success');
    await fetchTasks();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  try {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete task");
    showToast('Task deleted', 'info');
    await fetchTasks();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// UI Rendering Functions
function renderStats() {
  const s = state.stats || { total: 0, completed: 0, in_progress: 0, pending: 0, blocked: 0, completion_rate: 0 };
  
  document.getElementById('stat-total').innerText = s.total || 0;
  document.getElementById('stat-completed').innerText = s.completed || 0;
  document.getElementById('stat-in-progress').innerText = s.in_progress || 0;
  document.getElementById('stat-pending').innerText = s.pending || 0;
  document.getElementById('stat-blocked').innerText = s.blocked || 0;
  
  const rate = s.completion_rate || 0;
  document.getElementById('progress-percentage').innerText = `${rate}%`;
  document.getElementById('progress-bar-fill').style.width = `${rate}%`;
}

function renderTodoList() {
  const container = document.getElementById('todo-list');
  container.innerHTML = '';

  if (!state.tasks || state.tasks.length === 0) {
    container.innerHTML = `<div class="empty-state" style="text-align: center; padding: 40px; color: #94a3b8;">
      <p style="font-size: 32px; margin-bottom: 8px;">📋</p>
      <p>No tasks found. Add a daily task to get started!</p>
    </div>`;
    return;
  }

  state.tasks.forEach(task => {
    const isCompleted = task.status === 'Completed';
    const prioClass = task.priority.toLowerCase();

    const item = document.createElement('div');
    item.className = `task-item ${isCompleted ? 'completed' : ''}`;
    item.innerHTML = `
      <div class="task-checkbox" data-id="${task.id}" data-current="${task.status}">
        ${isCompleted ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-header-row">
          <span class="task-title-text">#${task.id}. ${escapeHtml(task.title)}</span>
          <span class="badge badge-${prioClass}">🔴 ${task.priority} Priority</span>
          <span class="badge badge-duration">⏱ ${escapeHtml(task.duration || '1 hr')}</span>
          <span class="badge badge-category">${escapeHtml(task.category)}</span>
        </div>
        ${task.notes ? `<div class="task-notes-text">📝 ${escapeHtml(task.notes)}</div>` : ''}
      </div>
      <div class="task-actions">
        <select class="status-select" data-id="${task.id}">
          <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>📌 Pending</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>⏳ In Progress</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
          <option value="Blocked" ${task.status === 'Blocked' ? 'selected' : ''}>🛑 Blocked</option>
        </select>
        <button class="btn-edit" data-id="${task.id}" title="Edit Task">✏️</button>
        <button class="btn-delete" data-id="${task.id}" title="Delete Task">🗑️</button>
      </div>
    `;

    // Event handlers
    item.querySelector('.task-checkbox').addEventListener('click', (e) => {
      const current = e.currentTarget.getAttribute('data-current');
      const nextStatus = current === 'Completed' ? 'Pending' : 'Completed';
      updateTaskStatus(task.id, nextStatus);
    });

    item.querySelector('.status-select').addEventListener('change', (e) => {
      updateTaskStatus(task.id, e.target.value);
    });

    item.querySelector('.btn-edit').addEventListener('click', () => {
      openEditModal(task);
    });

    item.querySelector('.btn-delete').addEventListener('click', () => {
      deleteTask(task.id);
    });

    container.appendChild(item);
  });
}

function renderPomoTaskSelect() {
  const select = document.getElementById('pomo-task-select');
  select.innerHTML = '<option value="">-- Select Active Task --</option>';
  state.tasks.forEach(t => {
    if (t.status !== 'Completed') {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.innerText = `#${t.id} ${t.title} [${t.priority}]`;
      select.appendChild(opt);
    }
  });
}

// Edit Modal Functions
function openEditModal(task) {
  document.getElementById('edit-task-id').value = task.id;
  document.getElementById('edit-task-title').value = task.title;
  document.getElementById('edit-task-category').value = task.category || 'General';
  document.getElementById('edit-task-priority').value = task.priority || 'Medium';
  document.getElementById('edit-task-duration').value = task.duration || '1 hr';
  document.getElementById('edit-task-status').value = task.status || 'Pending';
  document.getElementById('edit-task-notes').value = task.notes || '';

  document.getElementById('edit-task-modal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('edit-task-modal').classList.remove('active');
}

// Pomodoro Timer Functions
function updateTimerDisplay() {
  const mins = Math.floor(state.pomo.timeLeft / 60);
  const secs = state.pomo.timeLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  document.getElementById('timer-display').innerText = formatted;
}

function updatePomoToggleButton(text, className) {
  const toggleBtn = document.getElementById('pomo-toggle-btn');
  const startBtn = document.getElementById('pomo-start-btn');
  const pauseBtn = document.getElementById('pomo-pause-btn');

  if (toggleBtn) {
    toggleBtn.innerText = text;
    toggleBtn.className = `btn ${className}`;
  }
  if (startBtn) {
    if (text === '⏸ Pause') {
      startBtn.disabled = true;
      startBtn.innerText = '▶ Running...';
    } else {
      startBtn.disabled = false;
      startBtn.innerText = text;
      startBtn.className = `btn ${className}`;
    }
  }
  if (pauseBtn) {
    if (text === '⏸ Pause') {
      pauseBtn.disabled = false;
      pauseBtn.innerText = '⏸ Pause';
      pauseBtn.className = 'btn btn-warning';
    } else if (text === '▶ Resume') {
      pauseBtn.disabled = false;
      pauseBtn.innerText = '▶ Resume';
      pauseBtn.className = 'btn btn-success';
    } else {
      pauseBtn.disabled = true;
      pauseBtn.innerText = '⏸ Pause';
      pauseBtn.className = 'btn btn-warning';
    }
  }
}

function startPomodoro() {
  if (state.pomo.isRunning) return;
  state.pomo.isRunning = true;
  updatePomoToggleButton('⏸ Pause', 'btn-warning');

  state.pomo.timerId = setInterval(() => {
    if (state.pomo.timeLeft > 0) {
      state.pomo.timeLeft--;
      updateTimerDisplay();
    } else {
      resetPomodoro();
      playChime();
      showToast('🎉 Pomodoro Session Completed!', 'success');

      // Prompt to complete active task if selected
      const taskId = document.getElementById('pomo-task-select').value;
      if (taskId) {
        if (confirm("Focus session finished! Mark this target task as Completed?")) {
          updateTaskStatus(parseInt(taskId), 'Completed', 'Completed via Pomodoro Session');
        }
      }
    }
  }, 1000);
}

function pausePomodoro() {
  state.pomo.isRunning = false;
  if (state.pomo.timerId) {
    clearInterval(state.pomo.timerId);
    state.pomo.timerId = null;
  }
  updatePomoToggleButton('▶ Resume', 'btn-success');
}

function togglePomodoro() {
  if (state.pomo.isRunning) {
    pausePomodoro();
  } else {
    startPomodoro();
  }
}

function resetPomodoro() {
  state.pomo.isRunning = false;
  if (state.pomo.timerId) {
    clearInterval(state.pomo.timerId);
    state.pomo.timerId = null;
  }
  state.pomo.timeLeft = POMO_DURATIONS[state.pomo.mode];
  updateTimerDisplay();
  updatePomoToggleButton('▶ Start Focus', 'btn-success');
}

// Mentor Email Generator Functions
function generateMentorReportText() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const completedTasks = state.tasks.filter(t => t.status === 'Completed');
  const inProgressTasks = state.tasks.filter(t => t.status === 'In Progress');
  const pendingTasks = state.tasks.filter(t => t.status === 'Pending');
  const blockedTasks = state.tasks.filter(t => t.status === 'Blocked');
  const stats = state.stats || {};

  let text = `Subject: Brototype Daily Task Update - ${today}\n\n`;
  text += `Hi Mentor,\n\nHere is my Brototype daily progress report for ${today}:\n\n`;
  text += `📊 SUMMARY DASHBOARD:\n`;
  text += `----------------------------------------\n`;
  text += `• Total Tasks Scheduled: ${stats.total || 0}\n`;
  text += `• Tasks Completed:       ${stats.completed || 0}\n`;
  text += `• Completion Rate:       ${stats.completion_rate || 0}%\n\n`;

  text += `✅ COMPLETED TASKS (${completedTasks.length}):\n`;
  text += `----------------------------------------\n`;
  if (completedTasks.length === 0) {
    text += `(No tasks completed yet today)\n\n`;
  } else {
    completedTasks.forEach((t, i) => {
      text += `${i + 1}. [${t.priority} Priority] ${t.title} (${t.duration || '1 hr'})\n`;
      text += `   Category: ${t.category}\n`;
      if (t.notes) text += `   Notes: ${t.notes}\n`;
      text += `\n`;
    });
  }

  if (inProgressTasks.length > 0) {
    text += `⏳ IN PROGRESS TASKS (${inProgressTasks.length}):\n`;
    text += `----------------------------------------\n`;
    inProgressTasks.forEach((t, i) => {
      text += `${i + 1}. ${t.title} (${t.duration || '1 hr'}) - [${t.priority} Priority]\n`;
    });
    text += `\n`;
  }

  if (blockedTasks.length > 0) {
    text += `🛑 IDENTIFIED BLOCKERS / ISSUES:\n`;
    text += `----------------------------------------\n`;
    blockedTasks.forEach((t, i) => {
      text += `${i + 1}. ${t.title}: ${t.notes || 'Needs mentor discussion'}\n`;
    });
    text += `\n`;
  }

  text += `Thank you,\nBrototype Student\n`;
  return text;
}

function openMentorEmailModal() {
  const modal = document.getElementById('email-modal');
  const emailInput = document.getElementById('mentor-email-input');
  const subjectInput = document.getElementById('email-subject-input');
  const bodyTextarea = document.getElementById('email-body-preview');

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const reportText = generateMentorReportText();

  emailInput.value = state.mentorEmail;
  subjectInput.value = `Brototype Daily Progress Report - ${today}`;
  bodyTextarea.value = reportText;

  modal.classList.add('active');
}

function closeMentorEmailModal() {
  document.getElementById('email-modal').classList.remove('active');
}

function sendMailtoEmail() {
  const mentorEmail = document.getElementById('mentor-email-input').value.trim() || 'mentor@brototype.com';
  localStorage.setItem('mentor_email', mentorEmail);
  state.mentorEmail = mentorEmail;

  const subject = document.getElementById('email-subject-input').value;
  const body = document.getElementById('email-body-preview').value;

  const mailtoUrl = `mailto:${encodeURIComponent(mentorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');
  showToast('Opening email client...', 'info');
}

function copyReportToClipboard() {
  const text = document.getElementById('email-body-preview').value;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Report copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy text', 'error');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  fetchTasks();

  // Add Task Form Handler
  document.getElementById('add-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const category = document.getElementById('task-category').value;
    const priority = document.getElementById('task-priority').value;
    const duration = document.getElementById('task-duration').value;
    const notes = document.getElementById('task-notes').value;

    addTask({ title, category, priority, duration, notes, status: 'Pending' });

    document.getElementById('task-title').value = '';
    document.getElementById('task-notes').value = '';
  });

  // Edit Task Form Handler
  document.getElementById('edit-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-task-id').value);
    const title = document.getElementById('edit-task-title').value;
    const category = document.getElementById('edit-task-category').value;
    const priority = document.getElementById('edit-task-priority').value;
    const duration = document.getElementById('edit-task-duration').value;
    const status = document.getElementById('edit-task-status').value;
    const notes = document.getElementById('edit-task-notes').value;

    updateTaskFullDetails(id, { title, category, priority, duration, status, notes });
    closeEditModal();
  });

  document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
  document.getElementById('cancel-edit-modal').addEventListener('click', closeEditModal);

  // Filter Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.currentFilter = e.target.getAttribute('data-status');
      fetchTasks();
    });
  });

  // Sort Select
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    fetchTasks();
  });

  // Search Input
  let searchTimeout = null;
  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      fetchTasks();
    }, 300);
  });

  // Pomodoro Controls
  const toggleBtn = document.getElementById('pomo-toggle-btn');
  if (toggleBtn) toggleBtn.addEventListener('click', togglePomodoro);
  
  const startBtn = document.getElementById('pomo-start-btn');
  if (startBtn) startBtn.addEventListener('click', startPomodoro);
  
  const pauseBtn = document.getElementById('pomo-pause-btn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePomodoro);

  document.getElementById('pomo-reset-btn').addEventListener('click', resetPomodoro);

  document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const mode = e.target.getAttribute('data-mode');
      state.pomo.mode = mode;
      document.getElementById('pomo-mode-badge').innerText = mode === 'work' ? 'Work Session' : (mode === 'shortBreak' ? 'Short Break' : 'Long Break');
      resetPomodoro();
    });
  });

  // Mentor Email Modal
  document.getElementById('send-report-btn').addEventListener('click', openMentorEmailModal);
  document.getElementById('close-email-modal').addEventListener('click', closeMentorEmailModal);
  document.getElementById('open-mailto-btn').addEventListener('click', sendMailtoEmail);
  document.getElementById('copy-report-btn').addEventListener('click', copyReportToClipboard);
  document.getElementById('config-mentor-btn').addEventListener('click', openMentorEmailModal);
});
