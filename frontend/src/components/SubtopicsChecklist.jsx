import React, { useState } from 'react';

export default function SubtopicsChecklist({ taskId, subtopics = [], onToggleSubtopic, onAddSubtopic, onDeleteSubtopic }) {
  const [newTitle, setNewTitle] = useState('');
  const completedCount = subtopics.filter((s) => s.completed).length;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddSubtopic(taskId, newTitle.trim());
    setNewTitle('');
  };

  return (
    <div className="subtopics-container">
      <div className="subtopics-header">
        <span>Subtopics Checklist</span>
        <span>{completedCount}/{subtopics.length} Done</span>
      </div>

      {subtopics.map((sub, sIdx) => (
        <div key={sub.id || sIdx} className={`subtopic-item ${sub.completed ? 'completed' : ''}`}>
          <input
            type="checkbox"
            className="subtopic-checkbox"
            checked={Boolean(sub.completed)}
            onChange={(e) => onToggleSubtopic(taskId, sIdx, e.target.checked, e)}
          />
          <span className="subtopic-title" style={{ flex: 1 }}>{sub.title}</span>
          <button
            type="button"
            className="btn-delete-subtopic"
            onClick={() => onDeleteSubtopic(taskId, sIdx)}
            title="Delete subtopic"
            style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}
          >
            ✖
          </button>
        </div>
      ))}

      <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="➕ Add a subtopic..."
          style={{ flex: 1, padding: '4px 8px', fontSize: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
        />
        <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '3px 10px', fontSize: '11px' }}>
          Add
        </button>
      </form>
    </div>
  );
}
