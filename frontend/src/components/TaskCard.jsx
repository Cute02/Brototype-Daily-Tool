import React from 'react';
import SubtopicsChecklist from './SubtopicsChecklist';

export default function TaskCard({
  task,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onToggleSubtopic,
  onAddSubtopic,
  onDeleteSubtopic,
  onOpenEditModal,
  onDelete,
}) {
  const isCompleted = task.status === 'Completed';
  const prioClass = task.priority ? task.priority.toLowerCase() : 'medium';
  const subtopics = task.subtopics || [];
  const completedSubtopics = subtopics.filter((s) => s.completed).length;

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

      <div
        className="task-checkbox"
        onClick={(e) => onUpdateStatus(task.id, isCompleted ? 'Pending' : 'Completed', e)}
      >
        {isCompleted ? '✓' : ''}
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
          onAddSubtopic={onAddSubtopic}
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
