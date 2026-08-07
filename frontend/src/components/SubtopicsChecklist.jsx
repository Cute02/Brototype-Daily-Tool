import React from 'react';

export default function SubtopicsChecklist({ taskId, subtopics = [], onToggleSubtopic, onDeleteSubtopic }) {
  const completedCount = subtopics.filter((s) => s.completed).length;

  if (!subtopics || subtopics.length === 0) return null;

  return (
    <div className="subtopics-container">
      <div className="subtopics-header">
        <span>📑 Extracted Subtopics Checklist</span>
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
    </div>
  );
}

