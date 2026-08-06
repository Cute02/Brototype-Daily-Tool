import React, { useState } from 'react';

export default function TaskForm({ onAddTask }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Medium');
  const [duration, setDuration] = useState('1 hr');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      category: category.trim() || 'General',
      priority,
      duration,
      notes: notes.trim(),
      status: 'Pending',
    });

    setTitle('');
    setNotes('');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>➕ Add Daily Task</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Task Title / Topic Name</label>
          <input
            type="text"
            placeholder="e.g. Build REST API for Tasks"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category / Module</label>
            <input
              type="text"
              placeholder="e.g. Python Backend"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Priority Level</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🔵 Low</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Estimated Duration</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value="30 mins">⚡ 30 mins</option>
            <option value="1 hr">⏱️ 1 hr</option>
            <option value="2 hrs">⏳ 2 hrs</option>
            <option value="3 hrs">🎯 3 hrs</option>
          </select>
        </div>

        <div className="form-group">
          <label>Notes / Checklist Items</label>
          <textarea
            rows="2"
            placeholder="Optional implementation details or blockers..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>

        <button type="submit" className="btn btn-primary btn-block">
          ✨ Add Task to Dashboard
        </button>
      </form>
    </div>
  );
}
