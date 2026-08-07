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

// Auth Header Helper
function getAuthHeaders() {
  const token = state.authToken || localStorage.getItem('auth_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

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

// High-Performance 60fps Canvas Confetti Engine
class ConfettiEngine {
  constructor() {
    this.canvas = document.getElementById('confetti-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animating = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x, y, count = 40) {
    if (!this.canvas) {
      this.canvas = document.getElementById('confetti-canvas');
      if (this.canvas) this.ctx = this.canvas.getContext('2d');
    }
    if (!this.canvas || !this.ctx) return;
    this.resize();

    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#38bdf8'];
    const emojis = ['✨', '⭐', '🌸', '💖', '🎉', '🌟', '💫', '🎊'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      const isEmoji = Math.random() < 0.35;
      
      this.particles.push({
        x: x || window.innerWidth / 2,
        y: y || window.innerHeight / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji: isEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : null,
        size: isEmoji ? (18 + Math.random() * 10) : (6 + Math.random() * 6),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        alpha: 1,
        life: 1,
        decay: 0.012 + Math.random() * 0.015
      });
    }

    if (!this.animating) {
      this.animating = true;
      requestAnimationFrame(() => this.loop());
    }
  }

  loop() {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.rotSpeed;
      p.life -= p.decay;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.emoji) {
        this.ctx.font = `${p.size}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(p.emoji, 0, 0);
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.animating = false;
    }
  }
}

let globalConfettiEngine = null;
function triggerConfettiBurst(x, y, count = 40) {
  if (!globalConfettiEngine) {
    globalConfettiEngine = new ConfettiEngine();
  }
  globalConfettiEngine.burst(x, y, count);
}

// Auth Headers Helper
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.authToken) {
    headers['Authorization'] = `Bearer ${state.authToken}`;
  }
  return headers;
}

// GitHub Pages Client-Side Storage Engine
const IS_GITHUB_PAGES = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';

function getStoredTasksFromLocalStorage() {
  try {
    const raw = localStorage.getItem('brototype_daily_tasks');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  
  // Default starter tasks for GitHub Pages live demo
  const defaults = [
    {
      id: 1,
      title: "Core Python Programming & Data Structures",
      category: "Module: Python Basics",
      priority: "High",
      duration: "2 hrs",
      notes: "Auto-generated syllabus checklist for Brototype daily tracking.",
      status: "In Progress",
      is_highlighted: true,
      subtopics: [
        { id: "sub_1", title: "Variables and Dynamic Typing", completed: true },
        { id: "sub_2", title: "Control Flow & Loop Constructs", completed: true },
        { id: "sub_3", title: "Lists, Dictionaries and Set Comprehensions", completed: false }
      ]
    },
    {
      id: 2,
      title: "REST API & HTTP Protocol Fundamentals",
      category: "Module: Backend Architecture",
      priority: "Medium",
      duration: "1 hr",
      notes: "Understanding status codes, headers, and request methods.",
      status: "Pending",
      is_highlighted: false,
      subtopics: [
        { id: "sub_1", title: "HTTP Request Methods (GET, POST, PUT, DELETE)", completed: false },
        { id: "sub_2", title: "JSON Payload Serialization", completed: false }
      ]
    }
  ];
  localStorage.setItem('brototype_daily_tasks', JSON.stringify(defaults));
  return defaults;
}

function setStoredTasksToLocalStorage(tasks) {
  try {
    localStorage.setItem('brototype_daily_tasks', JSON.stringify(tasks));
  } catch (e) {}
}

function calculateLocalStorageStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, inProgress, pending, completionPercentage: percent };
}

// REST API Methods with GitHub Pages LocalStorage Fallback
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
    if (IS_GITHUB_PAGES || err.message.includes('Failed to load') || err.name === 'TypeError') {
      let tasks = getStoredTasksFromLocalStorage();
      if (state.currentFilter !== 'ALL') {
        tasks = tasks.filter(t => t.status === state.currentFilter);
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q)));
      }
      state.tasks = tasks;
      state.stats = calculateLocalStorageStats(getStoredTasksFromLocalStorage());
      renderStats();
      renderTodoList();
      renderPomoTaskSelect();
      return;
    }
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
    if (IS_GITHUB_PAGES || err.name === 'TypeError') {
      const allTasks = getStoredTasksFromLocalStorage();
      const newId = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.id)) + 1 : 1;
      const newTask = { id: newId, status: 'Pending', subtopics: [], ...taskData };
      allTasks.push(newTask);
      setStoredTasksToLocalStorage(allTasks);
      showToast('✓ Task created successfully!', 'success');
      await fetchTasks();
      return;
    }
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
    if (IS_GITHUB_PAGES || err.name === 'TypeError') {
      const allTasks = getStoredTasksFromLocalStorage();
      const t = allTasks.find(x => x.id === id);
      if (t) {
        t.status = status;
        if (notes !== null) t.notes = notes;
        setStoredTasksToLocalStorage(allTasks);
        showToast(`✓ Status updated to ${status}`, 'success');
        await fetchTasks();
        return;
      }
    }
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
    if (IS_GITHUB_PAGES || err.name === 'TypeError') {
      const allTasks = getStoredTasksFromLocalStorage();
      const idx = allTasks.findIndex(x => x.id === id);
      if (idx !== -1) {
        allTasks[idx] = { ...allTasks[idx], ...details };
        setStoredTasksToLocalStorage(allTasks);
        showToast('✓ Task updated successfully!', 'success');
        await fetchTasks();
        return;
      }
    }
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
  const forgotTab = document.getElementById('auth-tab-forgot');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-password-form');
  const title = document.getElementById('auth-modal-title');

  if (loginTab) loginTab.classList.remove('active');
  if (registerTab) registerTab.classList.remove('active');
  if (forgotTab) forgotTab.classList.remove('active');
  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'none';

  if (tab === 'login') {
    if (loginTab) loginTab.classList.add('active');
    if (loginForm) loginForm.style.display = 'block';
    if (title) title.innerText = '🔐 Sign In to Brototype Tasks';
  } else if (tab === 'register') {
    if (registerTab) registerTab.classList.add('active');
    if (registerForm) registerForm.style.display = 'block';
    if (title) title.innerText = '✨ Create Brototype Account';
  } else if (tab === 'forgot') {
    if (forgotTab) forgotTab.classList.add('active');
    if (forgotForm) forgotForm.style.display = 'block';
    if (title) title.innerText = '🔑 Reset Your Password';
  }
}

async function requestForgotPassword(identifier) {
  if (!identifier) {
    showToast('Please enter your Username or Email Address', 'error');
    return;
  }
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to request password reset");
    }

    const badge = document.getElementById('forgot-link-badge');
    const otpEl = document.getElementById('forgot-demo-otp');
    const linkEl = document.getElementById('forgot-demo-link');
    const step2 = document.getElementById('forgot-step-2');

    if (badge && otpEl && linkEl) {
      otpEl.innerText = data.otp;
      linkEl.href = data.verification_link;
      linkEl.innerText = data.verification_link;
      linkEl.onclick = (e) => {
        e.preventDefault();
        const otpInput = document.getElementById('forgot-otp-input');
        if (otpInput) otpInput.value = data.reset_token;
        if (step2) step2.style.display = 'block';
        showToast('Verification token populated into reset form!', 'info');
      };
      badge.style.display = 'block';
    }

    if (step2) step2.style.display = 'block';
    showToast(`📩 Verification link & OTP generated for ${data.username}`, 'success');
  } catch (err) {
    showToast(`Reset Error: ${err.message}`, 'error');
  }
}

async function resetPasswordWithToken(identifier, codeOrToken, newPassword, confirmPassword) {
  if (!identifier || !codeOrToken || !newPassword) {
    showToast('Please complete all required fields', 'error');
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }
  try {
    const isOtp = /^\d{6}$/.test(codeOrToken.trim());
    const payload = {
      identifier: identifier,
      new_password: newPassword,
      ...(isOtp ? { otp: codeOrToken.trim() } : { token: codeOrToken.trim() })
    };

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Password reset failed");
    }

    showToast(`🔒 ${data.message}`, 'success');
    
    // Auto-fill username in login form and switch to login tab for Google Passwords prompt
    const loginUser = document.getElementById('login-username');
    const loginPass = document.getElementById('login-password');
    if (loginUser) loginUser.value = data.username;
    if (loginPass) loginPass.value = newPassword;

    // Clear URL params if resetting via link
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    switchAuthTab('login');
  } catch (err) {
    showToast(`Reset Failed: ${err.message}`, 'error');
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
  const completed = s.completed || 0;
  const total = s.total || 0;

  const progressPct = document.getElementById('progress-percentage');
  const progressFill = document.getElementById('progress-bar-fill');
  if (progressPct) progressPct.innerText = `${rate}%`;
  if (progressFill) progressFill.style.width = `${rate}%`;

  // Update Circular Progress Ring Widget
  const circleText = document.getElementById('circle-percent-text');
  const circleFill = document.getElementById('circle-fill-bar');
  const circleLabel = document.getElementById('circle-status-label');
  const circleCount = document.getElementById('circle-count-text');

  if (circleText) circleText.innerText = `${rate}%`;
  if (circleCount) circleCount.innerText = `${completed} of ${total} Tasks Completed`;
  
  if (circleLabel) {
    if (rate >= 100 && total > 0) circleLabel.innerText = '🎉 All Done!';
    else if (rate >= 75) circleLabel.innerText = '🔥 Almost There!';
    else if (rate >= 50) circleLabel.innerText = '⚡ Great Progress!';
    else if (rate > 0) circleLabel.innerText = '🚀 Getting Started';
    else circleLabel.innerText = 'Keep Going!';
  }

  if (circleFill) {
    const radius = 52;
    const circumference = 2 * Math.PI * radius; // 326.72
    const offset = circumference - (rate / 100) * circumference;
    circleFill.style.strokeDasharray = `${circumference}`;
    circleFill.style.strokeDashoffset = `${offset}`;
  }
}

function deriveTopicState(subtopics) {
  if (!subtopics || subtopics.length === 0) return 'unchecked';
  const total = subtopics.length;
  const completedCount = subtopics.filter(s => Boolean(s.completed)).length;
  if (completedCount === total) return 'checked';
  if (completedCount > 0) return 'indeterminate';
  return 'unchecked';
}

function renderTasks() {
  const container = document.getElementById('task-list-container');
  if (!container) return;

  container.innerHTML = '';

  if (!state.tasks || state.tasks.length === 0) {
    container.innerHTML = `<div class="empty-state" style="text-align: center; padding: 40px; color: #94a3b8;">
      <p style="font-size: 32px; margin-bottom: 8px;">📋</p>
      <p>No tasks found. Add a daily task to get started!</p>
    </div>`;
    return;
  }

  state.tasks.forEach(task => {
    const subtopics = task.subtopics || [];
    const derivedState = deriveTopicState(subtopics);
    let isCompleted = task.status === 'Completed';
    if (subtopics.length > 0) {
      isCompleted = (derivedState === 'checked');
    }
    const prioClass = task.priority.toLowerCase();
    const completedSubtopics = subtopics.filter(s => s.completed).length;

    let subtopicsHtml = subtopics.length > 0 ? `
      <div class="subtopics-container">
        <div class="subtopics-header">
          <span>📑 Extracted Subtopics Checklist</span>
          <span>${completedSubtopics}/${subtopics.length} Done</span>
        </div>
        ${subtopics.map((sub, sIdx) => `
          <div class="subtopic-item ${sub.completed ? 'completed' : ''}">
            <input type="checkbox" class="subtopic-checkbox" data-task-id="${task.id}" data-sub-idx="${sIdx}" ${sub.completed ? 'checked' : ''}>
            <span class="subtopic-title" style="flex:1;">${escapeHtml(sub.title)}</span>
            <button class="btn-del-sub" data-task-id="${task.id}" data-sub-idx="${sIdx}" style="background:transparent;border:none;color:#f43f5e;cursor:pointer;opacity:0.7;">✖</button>
          </div>
        `).join('')}
      </div>
    ` : '';

    const item = document.createElement('div');
    item.className = `task-item ${isCompleted ? 'completed' : ''}`;
    item.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; width: 24px;">
        <input type="checkbox" class="topic-checkbox-input" data-id="${task.id}" ${isCompleted ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #6366f1;">
      </div>
      <div class="task-body">
        <div class="task-header-row">
          <span class="task-title-text">#${task.id}. ${escapeHtml(task.title)}</span>
          <span class="badge badge-${prioClass}">🔴 ${task.priority} Priority</span>
          <span class="badge badge-duration">⏱ ${escapeHtml(task.duration || '1 hr')}</span>
          <span class="badge badge-category">${escapeHtml(task.category)}</span>
          ${subtopics.length > 0 ? `<span class="badge subtopic-badge">📑 ${completedSubtopics}/${subtopics.length} Subtopics</span>` : ''}
        </div>
        ${task.notes ? `<div class="task-notes-text">📝 ${escapeHtml(task.notes)}</div>` : ''}
        ${subtopicsHtml}
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

    // Apply native DOM indeterminate property to topic checkbox input
    const topicCbInput = item.querySelector('.topic-checkbox-input');
    if (topicCbInput && subtopics.length > 0) {
      topicCbInput.indeterminate = (derivedState === 'indeterminate');
    }

    // 1. Topic Checkbox Click -> Cascades to ALL subtopics
    if (topicCbInput) {
      topicCbInput.addEventListener('change', (e) => {
        const checkAll = e.target.checked;
        const updatedSubtopics = (task.subtopics || []).map(s => ({ ...s, completed: checkAll }));
        const newStatus = checkAll ? 'Completed' : 'Pending';

        if (checkAll) {
          triggerConfettiBurst(e.clientX, e.clientY);
        }

        updateTaskFullDetails(task.id, { subtopics: updatedSubtopics, status: newStatus });
      });
    }

    // 2. Subtopic Checkbox Click -> Recomputes parent topic state and status
    item.querySelectorAll('.subtopic-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const subIdx = parseInt(e.target.getAttribute('data-sub-idx'));
        const isChecked = e.target.checked;

        const updatedSubtopics = task.subtopics.map((s, i) => {
          if (i === subIdx) {
            return { ...s, completed: isChecked };
          }
          return { ...s };
        });

        const newDerivedState = deriveTopicState(updatedSubtopics);
        let newStatus = 'Pending';
        if (newDerivedState === 'checked') {
          newStatus = 'Completed';
          triggerConfettiBurst(e.clientX, e.clientY);
        } else if (newDerivedState === 'indeterminate') {
          newStatus = 'In Progress';
        }

        updateTaskFullDetails(task.id, { subtopics: updatedSubtopics, status: newStatus });
      });
    });

    item.querySelectorAll('.btn-del-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const subIdx = parseInt(e.currentTarget.getAttribute('data-sub-idx'));
        const updatedSubtopics = task.subtopics.filter((_, i) => i !== subIdx);
        const newDerivedState = deriveTopicState(updatedSubtopics);
        let newStatus = 'Pending';
        if (newDerivedState === 'checked') newStatus = 'Completed';
        else if (newDerivedState === 'indeterminate') newStatus = 'In Progress';

        updateTaskFullDetails(task.id, { subtopics: updatedSubtopics, status: newStatus });
      });
    });

    item.querySelector('.status-select').addEventListener('change', (e) => {
      const selectedStatus = e.target.value;
      let updatedSubtopics = task.subtopics || [];

      if (selectedStatus === 'Completed') {
        updatedSubtopics = updatedSubtopics.map(s => ({ ...s, completed: true }));
        const rect = e.target.getBoundingClientRect();
        triggerConfettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else if (selectedStatus === 'Pending') {
        updatedSubtopics = updatedSubtopics.map(s => ({ ...s, completed: false }));
      }

      updateTaskFullDetails(task.id, { subtopics: updatedSubtopics, status: selectedStatus });
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
  const pomoCard = document.querySelector('.pomodoro-card');
  if (pomoCard) pomoCard.classList.add('active-timer');
  updatePomoToggleButton('⏸ Pause', 'btn-warning');

  state.pomo.timerId = setInterval(() => {
    if (state.pomo.timeLeft > 0) {
      state.pomo.timeLeft--;
      updateTimerDisplay();
    } else {
      resetPomodoro();
      playChime();
      triggerConfettiBurst(window.innerWidth / 2, window.innerHeight / 3);
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
  const pomoCard = document.querySelector('.pomodoro-card');
  if (pomoCard) pomoCard.classList.remove('active-timer');
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
  const pomoCard = document.querySelector('.pomodoro-card');
  if (pomoCard) pomoCard.classList.remove('active-timer');
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

function safeAddListener(id, event, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(event, handler);
  }
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  fetchTasks();

  // Authentication Handlers
  safeAddListener('login-modal-btn', 'click', () => openAuthModal('login'));
  safeAddListener('close-auth-modal', 'click', closeAuthModal);
  safeAddListener('cancel-auth-modal', 'click', closeAuthModal);
  safeAddListener('cancel-register-modal', 'click', closeAuthModal);
  safeAddListener('cancel-otp-modal', 'click', closeAuthModal);
  safeAddListener('logout-btn', 'click', () => logoutUser());

  safeAddListener('auth-tab-login', 'click', () => switchAuthTab('login'));
  safeAddListener('auth-tab-register', 'click', () => switchAuthTab('register'));

  // Password vs OTP Mode Toggles
  let activeAuthMode = 'password';
  const modePwdBtn = document.getElementById('mode-password-btn');
  const modeOtpBtn = document.getElementById('mode-otp-btn');
  const pwdContainer = document.getElementById('password-login-container');
  const otpContainer = document.getElementById('otp-login-container');

  if (modePwdBtn && modeOtpBtn) {
    modePwdBtn.addEventListener('click', () => {
      activeAuthMode = 'password';
      modePwdBtn.classList.add('active');
      modeOtpBtn.classList.remove('active');
      if (pwdContainer) pwdContainer.style.display = 'block';
      if (otpContainer) otpContainer.style.display = 'none';
    });
    modeOtpBtn.addEventListener('click', () => {
      activeAuthMode = 'otp';
      modeOtpBtn.classList.add('active');
      modePwdBtn.classList.remove('active');
      if (pwdContainer) pwdContainer.style.display = 'none';
      if (otpContainer) otpContainer.style.display = 'block';
    });
  }

  // OTP Request & Verification Handlers
  const reqOtpBtn = document.getElementById('request-otp-btn');
  if (reqOtpBtn) {
    reqOtpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-username')?.value.trim() || '';
      requestOTP(identifier);
    });
  }

  const verifyOtpBtn = document.getElementById('verify-otp-btn');
  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-username')?.value.trim() || '';
      const otp = document.getElementById('login-otp')?.value.trim() || '';
      verifyOTP(identifier, otp);
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-username')?.value.trim() || '';
      if (activeAuthMode === 'otp') {
        const otp = document.getElementById('login-otp')?.value.trim() || '';
        verifyOTP(identifier, otp);
      } else {
        const p = document.getElementById('login-password')?.value || '';
        loginUser(identifier, p);
      }
    });
  }

  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('register-username')?.value.trim() || '';
      const p = document.getElementById('register-password')?.value || '';
      const email = document.getElementById('register-email') ? document.getElementById('register-email').value.trim() : '';
      registerUser(u, p, email);
    });
  }

  // Add Task Form Handler
  const addTaskForm = document.getElementById('add-task-form');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title')?.value || '';
      const category = document.getElementById('task-category')?.value || 'General';
      const priority = document.getElementById('task-priority')?.value || 'Medium';
      const duration = document.getElementById('task-duration')?.value || '1 hr';
      const notes = document.getElementById('task-notes')?.value || '';

      addTask({ title, category, priority, duration, notes, status: 'Pending' });

      if (document.getElementById('task-title')) document.getElementById('task-title').value = '';
      if (document.getElementById('task-notes')) document.getElementById('task-notes').value = '';
    });
  }

  // Edit Task Form Handler
  const editTaskForm = document.getElementById('edit-task-form');
  if (editTaskForm) {
    editTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = parseInt(document.getElementById('edit-task-id')?.value || '0');
      const title = document.getElementById('edit-task-title')?.value || '';
      const category = document.getElementById('edit-task-category')?.value || 'General';
      const priority = document.getElementById('edit-task-priority')?.value || 'Medium';
      const duration = document.getElementById('edit-task-duration')?.value || '1 hr';
      const status = document.getElementById('edit-task-status')?.value || 'Pending';
      const notes = document.getElementById('edit-task-notes')?.value || '';

      updateTaskFullDetails(id, { title, category, priority, duration, status, notes });
      closeEditModal();
    });
  }

  safeAddListener('close-edit-modal', 'click', closeEditModal);
  safeAddListener('cancel-edit-modal', 'click', closeEditModal);

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
  safeAddListener('sort-select', 'change', (e) => {
    state.currentSort = e.target.value;
    fetchTasks();
  });

  // Search Input
  let searchTimeout = null;
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        fetchTasks();
      }, 300);
    });
  }

  // Pomodoro Controls
  safeAddListener('pomo-toggle-btn', 'click', togglePomodoro);
  safeAddListener('pomo-reset-btn', 'click', resetPomodoro);

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
  safeAddListener('send-report-btn', 'click', openMentorEmailModal);
  safeAddListener('close-email-modal', 'click', closeMentorEmailModal);
  safeAddListener('open-gmail-btn', 'click', sendGmailEmail);
  safeAddListener('open-mailto-btn', 'click', sendMailtoEmail);
  safeAddListener('copy-report-btn', 'click', copyReportToClipboard);
  safeAddListener('config-mentor-btn', 'click', openMentorEmailModal);

  // PDF Import Handlers
  safeAddListener('import-pdf-btn', 'click', openPdfModal);
  safeAddListener('import-pdf-card-btn', 'click', openPdfModal);
  safeAddListener('import-pdf-inline-btn', 'click', openPdfModal);
  safeAddListener('close-pdf-modal', 'click', closePdfModal);
  safeAddListener('cancel-pdf-modal', 'click', closePdfModal);

  const dropZone = document.getElementById('pdf-drop-zone');
  const fileInput = document.getElementById('pdf-file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handlePdfFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handlePdfFileSelect(e.target.files[0]);
      }
    });
  }

  safeAddListener('pdf-select-all-btn', 'click', () => {
    document.querySelectorAll('.pdf-task-checkbox').forEach(cb => cb.checked = true);
  });

  safeAddListener('pdf-deselect-all-btn', 'click', () => {
    document.querySelectorAll('.pdf-task-checkbox').forEach(cb => cb.checked = false);
  });

  safeAddListener('confirm-import-tasks-btn', 'click', confirmBatchImportTasks);

  const pdfModalOverlay = document.getElementById('pdf-import-modal');
  if (pdfModalOverlay) {
    pdfModalOverlay.addEventListener('click', (e) => {
      if (e.target === pdfModalOverlay) {
        closePdfModal(e);
      }
    });
  }

  // Dual Source Tab Switchers (File Explorer vs Google Drive)
  const tabFileBtn = document.getElementById('tab-source-file');
  const tabGdriveBtn = document.getElementById('tab-source-gdrive');
  const fileContainer = document.getElementById('source-file-container');
  const gdriveContainer = document.getElementById('source-gdrive-container');

  if (tabFileBtn && tabGdriveBtn) {
    tabFileBtn.addEventListener('click', () => {
      tabFileBtn.classList.add('active');
      tabGdriveBtn.classList.remove('active');
      if (fileContainer) fileContainer.style.display = 'block';
      if (gdriveContainer) gdriveContainer.style.display = 'none';
    });

    tabGdriveBtn.addEventListener('click', () => {
      tabGdriveBtn.classList.add('active');
      tabFileBtn.classList.remove('active');
      if (gdriveContainer) gdriveContainer.style.display = 'block';
      if (fileContainer) fileContainer.style.display = 'none';
    });
  }

  safeAddListener('fetch-url-doc-btn', 'click', handleUrlDocFetch);
});


// PDF & Document Syllabus Import Functions
let extractedPdfTasks = [];

function openPdfModal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  extractedPdfTasks = [];
  const fileInput = document.getElementById('pdf-file-input');
  if (fileInput) fileInput.value = '';
  const urlInput = document.getElementById('pdf-url-input');
  if (urlInput) urlInput.value = '';

  const preview = document.getElementById('pdf-preview-container');
  if (preview) preview.style.display = 'none';
  const footer = document.getElementById('pdf-modal-footer');
  if (footer) footer.style.display = 'none';
  const spinner = document.getElementById('pdf-parsing-spinner');
  if (spinner) spinner.style.display = 'none';

  // Reset tab states
  const tabFileBtn = document.getElementById('tab-source-file');
  const tabGdriveBtn = document.getElementById('tab-source-gdrive');
  const fileContainer = document.getElementById('source-file-container');
  const gdriveContainer = document.getElementById('source-gdrive-container');

  if (tabFileBtn) tabFileBtn.classList.add('active');
  if (tabGdriveBtn) tabGdriveBtn.classList.remove('active');
  if (fileContainer) fileContainer.style.display = 'block';
  if (gdriveContainer) gdriveContainer.style.display = 'none';

  // Set default start date input to today
  const startDateInput = document.getElementById('pdf-start-date-input');
  if (startDateInput) {
    const today = new Date().toISOString().split('T')[0];
    startDateInput.value = today;
  }

  const modal = document.getElementById('pdf-import-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closePdfModal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById('pdf-import-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function handlePdfFileSelect(file) {
  const allowedExts = ['.pdf', '.docx', '.doc', '.txt', '.md'];
  const fnLower = file.name.toLowerCase();
  const isAllowed = allowedExts.some(ext => fnLower.endsWith(ext));

  if (!isAllowed) {
    showToast('Please select a valid .pdf, .docx, .txt, or .md document', 'error');
    return;
  }

  const fileContainer = document.getElementById('source-file-container');
  if (fileContainer) fileContainer.style.display = 'none';
  document.getElementById('pdf-parsing-spinner').style.display = 'block';

  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Str = btoa(binary);

    fetch('/api/pdf/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        filename: file.name,
        pdf_base64: base64Str
      })
    })
    .then(res => res.json())
    .then(data => {
      document.getElementById('pdf-parsing-spinner').style.display = 'none';
      if (data.success && data.tasks && data.tasks.length > 0) {
        extractedPdfTasks = data.tasks;
        renderPdfTasksPreview();
        showToast(`AI extracted ${data.tasks.length} topics from ${file.name}`, 'success');
      } else {
        if (fileContainer) fileContainer.style.display = 'block';
        showToast(data.error || 'Failed to extract topics from file', 'error');
      }
    })
    .catch(err => {
      document.getElementById('pdf-parsing-spinner').style.display = 'none';
      if (fileContainer) fileContainer.style.display = 'block';
      showToast('Error uploading document: ' + err.message, 'error');
    });
  };
  reader.readAsArrayBuffer(file);
}

function handleUrlDocFetch() {
  const urlInput = document.getElementById('pdf-url-input');
  const docUrl = urlInput ? urlInput.value.trim() : '';

  if (!docUrl) {
    showToast('Please enter a valid Google Drive, Google Doc, or Document URL', 'error');
    return;
  }

  const fileContainer = document.getElementById('source-file-container');
  const gdriveContainer = document.getElementById('source-gdrive-container');
  if (fileContainer) fileContainer.style.display = 'none';
  if (gdriveContainer) gdriveContainer.style.display = 'none';

  document.getElementById('pdf-parsing-spinner').style.display = 'block';

  fetch('/api/pdf/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ doc_url: docUrl })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('pdf-parsing-spinner').style.display = 'none';
    if (data.success && data.tasks && data.tasks.length > 0) {
      extractedPdfTasks = data.tasks;
      renderPdfTasksPreview();
      showToast(`AI extracted ${data.tasks.length} topics from ${data.filename || 'URL'}`, 'success');
    } else {
      if (gdriveContainer) gdriveContainer.style.display = 'block';
      showToast(data.error || 'Failed to extract document from URL', 'error');
    }
  })
  .catch(err => {
    document.getElementById('pdf-parsing-spinner').style.display = 'none';
    if (gdriveContainer) gdriveContainer.style.display = 'block';
    showToast('Error fetching URL: ' + err.message, 'error');
  });
}

function renderPdfTasksPreview() {
  const container = document.getElementById('pdf-task-preview-list');
  container.innerHTML = '';

  document.getElementById('pdf-extracted-count').textContent = extractedPdfTasks.length;

  // Group tasks by category/module
  const moduleGroups = {};
  extractedPdfTasks.forEach((task, idx) => {
    const mod = task.category || 'General Module';
    if (!moduleGroups[mod]) moduleGroups[mod] = [];
    moduleGroups[mod].push({ ...task, origIndex: idx });
  });

  Object.keys(moduleGroups).forEach((modName) => {
    const groupTasks = moduleGroups[modName];

    // Calculate total hours in module
    let totalMins = 0;
    groupTasks.forEach(t => {
      if (t.duration.includes('30 min')) totalMins += 30;
      else if (t.duration.includes('1 hr')) totalMins += 60;
      else if (t.duration.includes('2 hr')) totalMins += 120;
      else if (t.duration.includes('3 hr')) totalMins += 180;
      else totalMins += 60;
    });
    const durationLabel = totalMins >= 60 ? `${(totalMins / 60).toFixed(1)} hrs` : `${totalMins} mins`;

    const groupCard = document.createElement('div');
    groupCard.className = 'module-group-card';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'module-group-header';
    groupHeader.innerHTML = `
      <span class="module-toggle-arrow">▼</span>
      <input type="checkbox" class="module-group-checkbox" checked style="width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer;">
      <span class="module-group-title">📂 ${escapeHtml(modName)}</span>
      <span class="badge badge-secondary" style="font-size: 0.75rem;">${groupTasks.length} topics · ⏱️ ${durationLabel}</span>
    `;

    const groupBody = document.createElement('div');
    groupBody.className = 'module-group-body';

    groupTasks.forEach((task) => {
      const idx = task.origIndex;
      const isHl = Boolean(task.is_highlighted);
      const subtopics = task.subtopics || [];
      const item = document.createElement('div');
      item.className = `pdf-preview-item ${isHl ? 'highlighted-topic' : ''}`;
      item.innerHTML = `
        <input type="checkbox" class="pdf-task-checkbox" data-idx="${idx}" checked>
        <div class="pdf-preview-info">
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="text" class="pdf-preview-title-input" id="pdf-title-${idx}" value="${escapeHtml(task.title)}" style="${isHl ? 'font-weight: 700; color: #fef08a;' : ''}">
            ${isHl ? '<span class="badge badge-warning" style="font-size: 0.68rem; padding: 2px 6px; white-space: nowrap;">✨ AI Highlighted</span>' : ''}
          </div>
          <div class="pdf-preview-meta">
            <span class="badge badge-secondary" style="font-size: 0.7rem;">${escapeHtml(task.category)}</span>
            ${subtopics.length > 0 ? `<span class="badge subtopic-badge" style="font-size: 0.7rem;">📑 ${subtopics.length} Subtopics</span>` : ''}
            <label style="color: var(--text-muted); font-size: 0.75rem;">Priority:</label>
            <select class="pdf-preview-select" id="pdf-prio-${idx}">
              <option value="High" ${task.priority === 'High' ? 'selected' : ''}>🔴 High</option>
              <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
              <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>🔵 Low</option>
            </select>
            <label style="color: var(--text-muted); font-size: 0.75rem;">Duration:</label>
            <select class="pdf-preview-select" id="pdf-dur-${idx}">
              <option value="30 mins" ${task.duration === '30 mins' ? 'selected' : ''}>⚡ 30 mins</option>
              <option value="1 hr" ${task.duration === '1 hr' ? 'selected' : ''}>⏱️ 1 hr</option>
              <option value="2 hrs" ${task.duration === '2 hrs' ? 'selected' : ''}>⏳ 2 hrs</option>
              <option value="3 hrs" ${task.duration === '3 hrs' ? 'selected' : ''}>🎯 3 hrs</option>
            </select>
          </div>
          ${subtopics.length > 0 ? `
            <div style="font-size: 0.78rem; color: #a5b4fc; margin-top: 6px; padding-left: 8px; border-left: 2px solid rgba(99, 102, 241, 0.4);">
              <strong>Extracted Subtopics:</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">
                ${subtopics.map(s => `<span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; color: #cbd5e1;">• ${escapeHtml(s.title)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
      groupBody.appendChild(item);
    });

    groupCard.appendChild(groupHeader);
    groupCard.appendChild(groupBody);
    container.appendChild(groupCard);

    // Module header accordion toggle
    groupHeader.addEventListener('click', (e) => {
      if (e.target.classList.contains('module-group-checkbox')) return;
      groupCard.classList.toggle('collapsed');
    });

    // Module checkbox batch toggle
    const moduleCb = groupHeader.querySelector('.module-group-checkbox');
    moduleCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      groupBody.querySelectorAll('.pdf-task-checkbox').forEach(cb => {
        cb.checked = isChecked;
      });
    });
  });

  document.getElementById('pdf-preview-container').style.display = 'block';
  document.getElementById('pdf-modal-footer').style.display = 'flex';
}

function confirmBatchImportTasks() {
  const selectedTasks = [];
  const checkboxes = document.querySelectorAll('.pdf-task-checkbox');

  checkboxes.forEach(cb => {
    if (cb.checked) {
      const idx = parseInt(cb.getAttribute('data-idx'));
      const original = extractedPdfTasks[idx];
      if (!original) return;

      const titleEl = document.getElementById(`pdf-title-${idx}`);
      const prioEl = document.getElementById(`pdf-prio-${idx}`);
      const durEl = document.getElementById(`pdf-dur-${idx}`);

      const editedTitle = titleEl ? titleEl.value.trim() : original.title;
      const editedPriority = prioEl ? prioEl.value : original.priority;
      const editedDuration = durEl ? durEl.value : original.duration;

      if (editedTitle) {
        selectedTasks.push({
          ...original,
          title: editedTitle,
          priority: editedPriority,
          duration: editedDuration
        });
      }
    }
  });

  if (selectedTasks.length === 0) {
    showToast('Please select at least one topic to import', 'warning');
    return;
  }

  // Pacing & Auto-Scheduling Calculation
  const isAutoSchedule = document.getElementById('pdf-enable-schedule-cb')?.checked ?? true;
  if (isAutoSchedule) {
    const dailyTargetHours = parseFloat(document.getElementById('pdf-daily-hours-select')?.value || '2');
    const startDateStr = document.getElementById('pdf-start-date-input')?.value;
    
    let currentDate = startDateStr ? new Date(startDateStr) : new Date();
    if (isNaN(currentDate.getTime())) currentDate = new Date();

    let currentDayAccumulatedHours = 0;
    let dayCounter = 1;

    selectedTasks.forEach((task) => {
      let taskHours = 1.0;
      if (task.duration.includes('30 min')) taskHours = 0.5;
      else if (task.duration.includes('1 hr')) taskHours = 1.0;
      else if (task.duration.includes('2 hr')) taskHours = 2.0;
      else if (task.duration.includes('3 hr')) taskHours = 3.0;

      if (currentDayAccumulatedHours + taskHours > dailyTargetHours && currentDayAccumulatedHours > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDayAccumulatedHours = 0;
        dayCounter++;
      }

      const formattedDate = currentDate.toISOString().split('T')[0];
      task.scheduled_time = `${formattedDate} (Day ${dayCounter})`;
      currentDayAccumulatedHours += taskHours;
    });
  }

  if (IS_GITHUB_PAGES) {
    const all = getStoredTasksFromLocalStorage();
    let maxId = all.length > 0 ? Math.max(...all.map(t => t.id)) : 0;
    const newTasks = selectedTasks.map(t => {
      maxId++;
      return { ...t, id: maxId, status: 'Pending', subtopics: t.subtopics || [] };
    });
    setStoredTasksToLocalStorage([...all, ...newTasks]);
    showToast(`✨ Imported ${newTasks.length} tasks with auto-scheduled study roadmap!`, 'success');
    closePdfModal();
    fetchTasks();
    return;
  }

  fetch('/api/tasks/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ tasks: selectedTasks })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast(`✨ Imported ${data.created_count} tasks with auto-scheduled study roadmap!`, 'success');
      closePdfModal();
      fetchTasks();
    } else {
      showToast(data.error || 'Batch import failed', 'error');
    }
  })
  .catch(err => {
    const all = getStoredTasksFromLocalStorage();
    let maxId = all.length > 0 ? Math.max(...all.map(t => t.id)) : 0;
    const newTasks = selectedTasks.map(t => {
      maxId++;
      return { ...t, id: maxId, status: 'Pending', subtopics: t.subtopics || [] };
    });
    setStoredTasksToLocalStorage([...all, ...newTasks]);
    showToast(`✨ Imported ${newTasks.length} tasks with auto-scheduled study roadmap!`, 'success');
    closePdfModal();
    fetchTasks();
  });
}

// Theme Switcher Initialization
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme_preference') || 'ember';
  document.body.setAttribute('data-theme', savedTheme);

  const themeDropdown = document.getElementById('theme-selector-dropdown');
  if (themeDropdown) {
    themeDropdown.value = savedTheme;
    themeDropdown.addEventListener('change', (e) => {
      const selected = e.target.value;
      document.body.setAttribute('data-theme', selected);
      localStorage.setItem('theme_preference', selected);
    });
  }

  // Auth Tab Listeners

  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabRegister = document.getElementById('auth-tab-register');
  const authTabForgot = document.getElementById('auth-tab-forgot');
  const forgotPassLink = document.getElementById('forgot-password-link');
  const cancelForgotModal = document.getElementById('cancel-forgot-modal');

  if (authTabLogin) authTabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (authTabRegister) authTabRegister.addEventListener('click', () => switchAuthTab('register'));
  if (authTabForgot) authTabForgot.addEventListener('click', () => switchAuthTab('forgot'));
  if (forgotPassLink) forgotPassLink.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('forgot');
  });
  if (cancelForgotModal) cancelForgotModal.addEventListener('click', closeAuthModal);

  // Send Reset Link & OTP button
  const sendResetBtn = document.getElementById('send-reset-link-btn');
  if (sendResetBtn) {
    sendResetBtn.addEventListener('click', () => {
      const identifier = document.getElementById('forgot-identifier')?.value.trim();
      requestForgotPassword(identifier);
    });
  }

  // Forgot Password Form submit
  const forgotForm = document.getElementById('forgot-password-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = document.getElementById('forgot-identifier')?.value.trim();
      const codeOrToken = document.getElementById('forgot-otp-input')?.value.trim();
      const newPassword = document.getElementById('forgot-new-password')?.value;
      const confirmPassword = document.getElementById('forgot-confirm-password')?.value;
      resetPasswordWithToken(identifier, codeOrToken, newPassword, confirmPassword);
    });
  }

  // Check URL query parameters for reset link (?action=reset-password&token=...&identifier=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const token = urlParams.get('token');
    const identifier = urlParams.get('identifier');

    if (action === 'reset-password' && token) {
      openAuthModal('forgot');
      const idInput = document.getElementById('forgot-identifier');
      const otpInput = document.getElementById('forgot-otp-input');
      const step2 = document.getElementById('forgot-step-2');

      if (idInput && identifier) idInput.value = identifier;
      if (otpInput) otpInput.value = token;
      if (step2) step2.style.display = 'block';

      showToast('🔑 Verification link detected! Please enter your new password below.', 'info');
    }
  } catch (err) {}
});

