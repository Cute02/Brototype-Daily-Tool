import React, { useRef, useEffect } from 'react';
import SubtopicsChecklist from './SubtopicsChecklist';

export function deriveTopicState(subtopics) {
  if (!subtopics || subtopics.length === 0) return 'unchecked';
  const total = subtopics.length;
  const completedCount = subtopics.filter((s) => Boolean(s.completed)).length;
  if (completedCount === total) return 'checked';
  if (completedCount > 0) return 'indeterminate';
  return 'unchecked';
}

export default function TaskCard({
  task,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onToggleSubtopic,
  onDeleteSubtopic,
  onOpenEditModal,
  onDelete,
}) {
  const subtopics = task.subtopics || [];
  const derivedState = deriveTopicState(subtopics);
  const isCompleted = subtopics.length > 0 ? derivedState === 'checked' : task.status === 'Completed';
  const prioClass = task.priority ? task.priority.toLowerCase() : 'medium';
  const completedSubtopics = subtopics.filter((s) => s.completed).length;

  const topicCheckboxRef = useRef(null);

  useEffect(() => {
    if (topicCheckboxRef.current && subtopics.length > 0) {
      topicCheckboxRef.current.indeterminate = (derivedState === 'indeterminate');
    }
  }, [derivedState, subtopics.length]);

  const handleTopicCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    const nextStatus = isChecked ? 'Completed' : 'Pending';
    onUpdateStatus(task.id, nextStatus, e, true); // pass cascadeAllSubtopics flag
  };

  return (
    <div className={`task-item ${isCompleted ? 'completed' : ''} ${isSelected ? 'selected-task-card' : ''}`}>
      {/* Batch Select Checkbox */}
      <input
        type="checkbox"
        checked={Boolean(isSelected)}
        onChange={() => onToggleSelect(task.id)}
        title="Select for batch action"
        style={{ marginTop: '5px', accentColor: '#f97316', cursor: 'pointer', width: '16px', height: '16px' }}
      />

      {/* Main Topic Checkbox with Native Indeterminate DOM Support */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
        <input
          type="checkbox"
          ref={topicCheckboxRef}
          checked={isCompleted}
          onChange={handleTopicCheckboxChange}
          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
        />
      </div>

      <div className="task-body">
        <div className="task-header-row">
          <span className="task-title-text">#{task.id}. {task.title}</span>
          <span className={`badge badge-${prioClass}`}>🔴 {task.priority} Priority</span>
          <span className="badge badge-duration">⏱ {task.duration || '1 hr'}</span>
          <span className="badge badge-category">{task.category}</span>
          {subtopics.length > 0 && (
            <span className="badge subtopic-badge">📑 {completedSubtopics}/{subtopics.length} Subtopics</span>
          )}
        </div>

        {task.notes && <div className="task-notes-text">📝 {task.notes}</div>}

        <SubtopicsChecklist
          taskId={task.id}
          subtopics={task.subtopics || []}
          onToggleSubtopic={onToggleSubtopic}
          onDeleteSubtopic={onDeleteSubtopic}
        />
      </div>

      <div className="task-actions">
        <select
          className="status-select"
          value={task.status}
          onChange={(e) => onUpdateStatus(task.id, e.target.value, e)}
        >
          <option value="Pending">📌 Pending</option>
          <option value="In Progress">⏳ In Progress</option>
          <option value="Completed">✅ Completed</option>
          <option value="Blocked">🛑 Blocked</option>
        </select>
        <button className="btn-edit" onClick={() => onOpenEditModal(task)} title="Edit Task">✏️</button>
        <button className="btn-delete" onClick={() => onDelete(task.id)} title="Delete Task">🗑️</button>
      </div>
    </div>
  );
}

