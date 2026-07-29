/* JavaScript Application Logic for Brototype Daily Tool */

// State Management
const state = {
  tasks: [],
  stats: {},
  currentFilter: 'ALL',
  currentSort: 'priority',
  searchQuery: '',
  mentorEmail: localStorage.getItem('mentor_email') || 'mentor@brototype.com',
  authToken: localStorage.getItem('auth_token') || null,
  currentUser: null,
  // Pomodoro State
  pomo: {
    mode: 'work',
    duration: 1500,
    timeLeft: 1500,
    timerId: null,
    isRunning: false,
    selectedTaskId: null
  }
};

const POMO_DURATIONS = {
  work: 1500,
  shortBreak: 300,
  longBreak: 900
};

// Web Audio Chime Generator
function playChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
    
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

// Auth Headers Helper
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.authToken) {
    headers['Authorization'] = `Bearer ${state.authToken}`;
  }
  return headers;
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

    const res = await fetch(url, { headers: getAuthHeaders() });
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
      headers: getAuthHeaders(),
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
    const payload = { status };
    if (notes !== null) payload.notes = notes;
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.status === 404) {
      showToast(`Task #${id} not found in your task list. Refreshing...`, 'warning');
      await fetchTasks();
      return;
    }
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
      headers: getAuthHeaders(),
      body: JSON.stringify(details)
    });
    if (res.status === 404) {
      showToast(`Task #${id} not found. Refreshing...`, 'warning');
      await fetchTasks();
      return;
    }
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
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.status === 404) {
      showToast(`Task #${id} not found. Refreshing...`, 'warning');
      await fetchTasks();
      return;
    }
    if (!res.ok) throw new Error("Failed to delete task");
    showToast('Task deleted', 'info');
    await fetchTasks();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Authentication API Methods
async function checkAuthStatus() {
  if (!state.authToken) {
    updateAuthUI(false, null);
    return;
  }
  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Session expired");
    const data = await res.json();
    if (data.authenticated) {
      state.currentUser = data.username;
      updateAuthUI(true, data.username);
    } else {
      logoutUser(false);
    }
  } catch (e) {
    logoutUser(false);
  }
}

async function loginUser(identifier, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Login failed");
    }

    state.authToken = data.token;
    state.currentUser = data.username;
    localStorage.setItem('auth_token', data.token);

    updateAuthUI(true, data.username);
    closeAuthModal();
    showToast(`🔓 Welcome back, ${data.username}!`, 'success');
    await fetchTasks();
  } catch (err) {
    showToast(`Login Error: ${err.message}`, 'error');
  }
}

async function registerUser(username, password, email = "") {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Registration failed");
    }

    state.authToken = data.token;
    state.currentUser = data.username;
    localStorage.setItem('auth_token', data.token);

    updateAuthUI(true, data.username);
    closeAuthModal();
    showToast(`✨ Account created! Welcome, ${data.username}!`, 'success');
    await fetchTasks();
  } catch (err) {
    showToast(`Register Error: ${err.message}`, 'error');
  }
}

async function requestOTP(identifier) {
  if (!identifier) {
    showToast('Please enter your Username or Email first.', 'error');
    return;
  }
  try {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to generate OTP");
    }

    const demoBadge = document.getElementById('otp-demo-badge');
    const demoVal = document.getElementById('demo-otp-val');
    if (demoBadge && demoVal) {
      demoVal.innerText = data.otp;
      demoBadge.style.display = 'block';
    }
    showToast(`📩 OTP sent! Demo Code: ${data.otp}`, 'success');
  } catch (err) {
    showToast(`OTP Request Error: ${err.message}`, 'error');
  }
}

async function verifyOTP(identifier, otp) {
  if (!identifier || !otp) {
    showToast('Please provide both Username/Email and 6-digit OTP.', 'error');
    return;
  }
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "OTP verification failed");
    }

    state.authToken = data.token;
    state.currentUser = data.username;
    localStorage.setItem('auth_token', data.token);

    updateAuthUI(true, data.username);
    closeAuthModal();
    showToast(`📱 OTP verified! Welcome back, ${data.username}!`, 'success');
    await fetchTasks();
  } catch (err) {
    showToast(`OTP Error: ${err.message}`, 'error');
  }
}

async function logoutUser(notify = true) {
  if (state.authToken) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (e) {}
  }

  state.authToken = null;
  state.currentUser = null;
  localStorage.removeItem('auth_token');

  updateAuthUI(false, null);
  if (notify) showToast('Logged out successfully', 'info');
  await fetchTasks();
}

function updateAuthUI(isLoggedIn, username) {
  const badge = document.getElementById('user-profile-badge');
  const nameSpan = document.getElementById('user-display-name');
  const loginBtn = document.getElementById('login-modal-btn');
  const logoutBtn = document.getElementById('logout-btn');

  if (isLoggedIn && username) {
    if (nameSpan) nameSpan.innerText = username;
    if (badge) badge.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  } else {
    if (badge) badge.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function openAuthModal(tab = 'login') {
  const modal = document.getElementById('auth-modal');
  switchAuthTab(tab);
  if (modal) modal.classList.add('active');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('active');
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('auth-tab-login');
  const registerTab = document.getElementById('auth-tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const title = document.getElementById('auth-modal-title');

  if (tab === 'login') {
    if (loginTab) loginTab.classList.add('active');
    if (registerTab) registerTab.classList.remove('active');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (title) title.innerText = '🔐 Sign In to Brototype Tasks';
  } else {
    if (registerTab) registerTab.classList.add('active');
    if (loginTab) loginTab.classList.remove('active');
    if (registerForm) registerForm.style.display = 'block';
    if (loginForm) loginForm.style.display = 'none';
    if (title) title.innerText = '✨ Create Brototype Account';
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
  if (toggleBtn) {
    toggleBtn.innerText = text;
    toggleBtn.className = `btn ${className}`;
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

function setCustomPomoMinutes(mins) {
  const seconds = mins * 60;
  state.pomo.duration = seconds;
  state.pomo.timeLeft = seconds;
  pausePomodoro();
  updateTimerDisplay();
  updatePomoToggleButton('▶ Start Focus', 'btn-success');
}

function adjustPomoSeconds(deltaSeconds) {
  let newTime = state.pomo.timeLeft + deltaSeconds;
  if (newTime < 60) newTime = 60;
  if (newTime > 10800) newTime = 10800;
  
  state.pomo.timeLeft = newTime;
  state.pomo.duration = newTime;
  updateTimerDisplay();

  const totalMins = Math.floor(newTime / 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  let timeStr = "";
  if (hrs > 0 && mins > 0) {
    timeStr = `${hrs} hr ${mins} mins`;
  } else if (hrs > 0) {
    timeStr = `${hrs} hr${hrs > 1 ? 's' : ''}`;
  } else {
    timeStr = `${mins} mins`;
  }

  showToast(`Timer set to ${timeStr}`, 'info');
}

function resetPomodoro() {
  state.pomo.isRunning = false;
  if (state.pomo.timerId) {
    clearInterval(state.pomo.timerId);
    state.pomo.timerId = null;
  }
  state.pomo.timeLeft = state.pomo.duration || 1500;
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
  const studentName = state.currentUser ? state.currentUser.toUpperCase() : "Brototype Student";

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

  text += `Thank you,\n${studentName}\n`;
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

function sendGmailEmail() {
  const mentorEmail = document.getElementById('mentor-email-input').value.trim() || 'mentor@brototype.com';
  localStorage.setItem('mentor_email', mentorEmail);
  state.mentorEmail = mentorEmail;

  const subject = document.getElementById('email-subject-input').value;
  const body = document.getElementById('email-body-preview').value;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mentorEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
  showToast('Opening Gmail web compose...', 'info');
}

function sendMailtoEmail() {
  const mentorEmail = document.getElementById('mentor-email-input').value.trim() || 'mentor@brototype.com';
  localStorage.setItem('mentor_email', mentorEmail);
  state.mentorEmail = mentorEmail;

  const subject = document.getElementById('email-subject-input').value;
  const body = document.getElementById('email-body-preview').value;

  const mailtoUrl = `mailto:${encodeURIComponent(mentorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');
  showToast('Opening system mail app...', 'info');
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
  checkAuthStatus();
  fetchTasks();

  // Authentication Handlers
  document.getElementById('login-modal-btn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);
  document.getElementById('cancel-auth-modal').addEventListener('click', closeAuthModal);
  document.getElementById('cancel-register-modal').addEventListener('click', closeAuthModal);
  const cancelOtpBtn = document.getElementById('cancel-otp-modal');
  if (cancelOtpBtn) cancelOtpBtn.addEventListener('click', closeAuthModal);
  document.getElementById('logout-btn').addEventListener('click', () => logoutUser());

  document.getElementById('auth-tab-login').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('auth-tab-register').addEventListener('click', () => switchAuthTab('register'));

  // Password vs OTP Mode Toggles
  const modePwdBtn = document.getElementById('mode-password-btn');
  const modeOtpBtn = document.getElementById('mode-otp-btn');
  const pwdContainer = document.getElementById('password-login-container');
  const otpContainer = document.getElementById('otp-login-container');

  if (modePwdBtn && modeOtpBtn) {
    modePwdBtn.addEventListener('click', () => {
      modePwdBtn.classList.add('active');
      modeOtpBtn.classList.remove('active');
      pwdContainer.style.display = 'block';
      otpContainer.style.display = 'none';
    });
    modeOtpBtn.addEventListener('click', () => {
      modeOtpBtn.classList.add('active');
      modePwdBtn.classList.remove('active');
      pwdContainer.style.display = 'none';
      otpContainer.style.display = 'block';
    });
  }

  // OTP Request & Verification Handlers
  const reqOtpBtn = document.getElementById('request-otp-btn');
  if (reqOtpBtn) {
    reqOtpBtn.addEventListener('click', () => {
      const identifier = document.getElementById('login-username').value.trim();
      requestOTP(identifier);
    });
  }

  const verifyOtpBtn = document.getElementById('verify-otp-btn');
  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
      const identifier = document.getElementById('login-username').value.trim();
      const otp = document.getElementById('login-otp').value.trim();
      verifyOTP(identifier, otp);
    });
  }

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    loginUser(identifier, p);
  });

  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('register-username').value.trim();
    const p = document.getElementById('register-password').value;
    const email = document.getElementById('register-email') ? document.getElementById('register-email').value.trim() : '';
    registerUser(u, p, email);
  });

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

  document.getElementById('pomo-reset-btn').addEventListener('click', resetPomodoro);

  const presetSelect = document.getElementById('pomo-preset-select');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      setCustomPomoMinutes(parseInt(e.target.value));
    });
  }

  document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const mins = parseInt(e.target.getAttribute('data-mins') || '25');
      if (presetSelect) presetSelect.value = mins;
      setCustomPomoMinutes(mins);
    });
  });

  document.querySelectorAll('.btn-adjust').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const delta = parseInt(e.target.getAttribute('data-adjust'));
      adjustPomoSeconds(delta);
    });
  });

  // Mentor Email Modal
  document.getElementById('send-report-btn').addEventListener('click', openMentorEmailModal);
  document.getElementById('close-email-modal').addEventListener('click', closeMentorEmailModal);
  document.getElementById('open-gmail-btn').addEventListener('click', sendGmailEmail);
  document.getElementById('open-mailto-btn').addEventListener('click', sendMailtoEmail);
  document.getElementById('copy-report-btn').addEventListener('click', copyReportToClipboard);
  document.getElementById('config-mentor-btn').addEventListener('click', openMentorEmailModal);
});
