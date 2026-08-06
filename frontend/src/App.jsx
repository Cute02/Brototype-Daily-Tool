import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatsDashboard from './components/StatsDashboard';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import PomodoroTimer from './components/PomodoroTimer';
import CircularProgress from './components/CircularProgress';
import DocumentImportModal from './components/DocumentImportModal';
import MentorEmailModal from './components/MentorEmailModal';
import AuthModal from './components/AuthModal';
import { triggerConfettiBurst } from './utils/confetti';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('ALL');
  const [theme, setTheme] = useState(localStorage.getItem('theme_preference') || 'ember');

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme_preference', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
  const [searchQuery, setSearchQuery] = useState('');

  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token') || null);
  const [currentUser, setCurrentUser] = useState(null);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    const token = authToken || localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [authToken]);

  const fetchTasks = useCallback(async () => {
    try {
      let url = `/api/tasks?sort_by=${sortBy}`;
      if (filter !== 'ALL') {
        url += `&status=${encodeURIComponent(filter)}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(data.stats || {});
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  }, [filter, sortBy, searchQuery, getAuthHeaders, showToast]);

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Session expired');
      const data = await res.json();
      if (data.authenticated) {
        setCurrentUser(data.username);
        setAuthToken(token);
      }
    } catch (e) {
      localStorage.removeItem('auth_token');
      setAuthToken(null);
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Task Actions
  const handleAddTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error('Failed to add task');
      showToast('✓ Task created successfully!', 'success');
      await fetchTasks();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleUpdateStatus = async (id, status, event) => {
    try {
      if (status === 'Completed' && event) {
        triggerConfettiBurst(event.clientX, event.clientY);
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(`✓ Status updated to ${status}`, 'success');
      await fetchTasks();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleUpdateFullDetails = async (id, details) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(details),
      });
      if (!res.ok) throw new Error('Failed to update task');
      showToast('✓ Task updated successfully!', 'success');
      await fetchTasks();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleToggleSubtopic = async (taskId, subIdx, isChecked, event) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const updatedSubtopics = targetTask.subtopics.map((s, i) => {
      if (i === subIdx) {
        return { ...s, completed: isChecked };
      }
      return { ...s };
    });

    const total = updatedSubtopics.length;
    const numDone = updatedSubtopics.filter((s) => s.completed).length;
    let newStatus = targetTask.status;

    if (numDone === total) {
      newStatus = 'Completed';
      if (event) triggerConfettiBurst(event.clientX, event.clientY);
    } else if (numDone > 0) {
      newStatus = 'In Progress';
    } else {
      newStatus = 'Pending';
    }

    await handleUpdateFullDetails(taskId, { subtopics: updatedSubtopics, status: newStatus });
  };

  const handleAddSubtopic = async (taskId, title) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const newSubId = `sub_${(targetTask.subtopics || []).length + 1}`;
    const updatedSubtopics = [...(targetTask.subtopics || []), { id: newSubId, title: title.trim(), completed: false }];
    
    // Calculate new status
    const total = updatedSubtopics.length;
    const numDone = updatedSubtopics.filter((s) => s.completed).length;
    let newStatus = targetTask.status;
    if (numDone === total && total > 0) newStatus = 'Completed';
    else if (numDone > 0) newStatus = 'In Progress';
    else newStatus = 'Pending';

    await handleUpdateFullDetails(taskId, { subtopics: updatedSubtopics, status: newStatus });
    showToast('➕ Subtopic added!', 'success');
  };

  const handleDeleteSubtopic = async (taskId, subIdx) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const updatedSubtopics = (targetTask.subtopics || []).filter((_, i) => i !== subIdx);
    
    const total = updatedSubtopics.length;
    const numDone = updatedSubtopics.filter((s) => s.completed).length;
    let newStatus = targetTask.status;
    if (total === 0) newStatus = targetTask.status;
    else if (numDone === total) newStatus = 'Completed';
    else if (numDone > 0) newStatus = 'In Progress';
    else newStatus = 'Pending';

    await handleUpdateFullDetails(taskId, { subtopics: updatedSubtopics, status: newStatus });
    showToast('Subtopic removed', 'info');
  };

  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const handleToggleSelectTask = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map((t) => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      const res = await fetch('/api/tasks/bulk-delete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedTaskIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete selected tasks');

      showToast(`🗑️ Deleted ${data.deleted_count} selected tasks!`, 'info');
      setSelectedTaskIds([]);
      await fetchTasks();
    } catch (err) {
      showToast(`Bulk Delete Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete task');
      showToast('Task deleted', 'info');
      await fetchTasks();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleBatchImport = async (batchTasks) => {
    try {
      const res = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tasks: batchTasks }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✨ Imported ${data.created_count} tasks!`, 'success');
        setIsPdfOpen(false);
        await fetchTasks();
      } else {
        showToast(data.error || 'Batch import failed', 'error');
      }
    } catch (err) {
      showToast('Import Error: ' + err.message, 'error');
    }
  };

  // Auth Handlers
  const handleLogin = async (identifier, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Login failed');

      setAuthToken(data.token);
      setCurrentUser(data.username);
      localStorage.setItem('auth_token', data.token);
      setIsAuthOpen(false);
      showToast(`🔓 Welcome back, ${data.username}!`, 'success');
      await fetchTasks();
    } catch (err) {
      showToast(`Login Error: ${err.message}`, 'error');
    }
  };

  const handleRegister = async (username, password, email) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Registration failed');

      setAuthToken(data.token);
      setCurrentUser(data.username);
      localStorage.setItem('auth_token', data.token);
      setIsAuthOpen(false);
      showToast(`✨ Account created! Welcome, ${data.username}!`, 'success');
      await fetchTasks();
    } catch (err) {
      showToast(`Register Error: ${err.message}`, 'error');
    }
  };

  const handleRequestOtp = async (identifier) => {
    if (!identifier) {
      showToast('Please enter your Username or Email first.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate OTP');

      showToast(`📩 OTP sent! Demo Code: ${data.otp}`, 'success');
    } catch (err) {
      showToast(`OTP Request Error: ${err.message}`, 'error');
    }
  };

  const handleVerifyOtp = async (identifier, otp) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'OTP verification failed');

      setAuthToken(data.token);
      setCurrentUser(data.username);
      localStorage.setItem('auth_token', data.token);
      setIsAuthOpen(false);
      showToast(`📱 OTP verified! Welcome back, ${data.username}!`, 'success');
      await fetchTasks();
    } catch (err) {
      showToast(`OTP Error: ${err.message}`, 'error');
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
      } catch (e) {}
    }
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    showToast('Logged out successfully', 'info');
    await fetchTasks();
  };

  return (
    <div className="app-container">
      <Header
        user={currentUser}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onOpenAuthModal={(tab) => { setAuthTab(tab); setIsAuthOpen(true); }}
        onLogout={handleLogout}
        onOpenPdfModal={() => setIsPdfOpen(true)}
        onOpenEmailModal={() => setIsEmailOpen(true)}
      />

      <StatsDashboard stats={stats} />

      <div className="main-layout">
        <div className="sidebar-layout">
          <TaskForm onAddTask={handleAddTask} />
          <CircularProgress stats={stats} />
          <PomodoroTimer tasks={tasks} onUpdateTaskStatus={handleUpdateStatus} showToast={showToast} />
        </div>

        <div className="card">
          <div className="toolbar">
            <div className="filter-tabs">
              {['ALL', 'Pending', 'In Progress', 'Completed', 'Blocked'].map((f) => (
                <button
                  key={f}
                  className={`tab-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="toolbar-right">
              {tasks.length > 0 && (
                <button className="btn btn-sm btn-secondary" onClick={handleSelectAll}>
                  {selectedTaskIds.length === tasks.length ? 'Deselect All' : 'Select All'}
                </button>
              )}

              {selectedTaskIds.length > 0 && (
                <button className="btn btn-sm btn-warning" onClick={handleBulkDelete}>
                  🗑️ Delete Selected ({selectedTaskIds.length})
                </button>
              )}

              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select className="select-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="priority">Sort: Priority 🔴</option>
                <option value="status">Sort: Status ⏳</option>
                <option value="id">Sort: ID #</option>
              </select>
            </div>
          </div>

          <div className="todo-list">
            {tasks.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>📋</p>
                <p>No tasks found. Add a daily task to get started!</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskIds.includes(task.id)}
                  onToggleSelect={handleToggleSelectTask}
                  onUpdateStatus={handleUpdateStatus}
                  onToggleSubtopic={handleToggleSubtopic}
                  onAddSubtopic={handleAddSubtopic}
                  onDeleteSubtopic={handleDeleteSubtopic}
                  onOpenEditModal={(t) => setEditingTask(t)}
                  onDelete={handleDeleteTask}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h2>✏️ Edit Task Details</h2>
              <button className="close-btn" onClick={() => setEditingTask(null)}>×</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateFullDetails(editingTask.id, editingTask);
                setEditingTask(null);
              }}
            >
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={editingTask.category}
                    onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration</label>
                  <select
                    value={editingTask.duration}
                    onChange={(e) => setEditingTask({ ...editingTask, duration: e.target.value })}
                  >
                    <option value="30 mins">30 mins</option>
                    <option value="1 hr">1 hr</option>
                    <option value="2 hrs">2 hrs</option>
                    <option value="3 hrs">3 hrs</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows="3"
                  value={editingTask.notes}
                  onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTask(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Importer Modal */}
      <DocumentImportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        onBatchImport={handleBatchImport}
        showToast={showToast}
        getAuthHeaders={getAuthHeaders}
      />

      {/* Mentor Email Modal */}
      <MentorEmailModal
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        tasks={tasks}
        stats={stats}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onRequestOtp={handleRequestOtp}
        onVerifyOtp={handleVerifyOtp}
      />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
