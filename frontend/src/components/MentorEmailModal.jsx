import React, { useState, useEffect } from 'react';

export default function MentorEmailModal({ isOpen, onClose, tasks, stats, currentUser, showToast }) {
  const [mentorEmail, setMentorEmail] = useState(localStorage.getItem('mentor_email') || 'mentor@brototype.com');
  const [subject, setSubject] = useState('');
  const [reportText, setReportText] = useState('');

  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const completedTasks = tasks.filter((t) => t.status === 'Completed');
      const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
      const blockedTasks = tasks.filter((t) => t.status === 'Blocked');

      const studentName = currentUser ? currentUser.toUpperCase() : 'Brototype Student';

      let text = `Subject: Brototype Daily Task Update - ${todayStr}\n\n`;
      text += `Hi Mentor,\n\nHere is my Brototype daily progress report for ${todayStr}:\n\n`;
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

      setSubject(`Brototype Daily Progress Report - ${todayStr}`);
      setReportText(text);
    }
  }, [isOpen, tasks, stats, currentUser]);

  if (!isOpen) return null;

  const sendGmail = () => {
    localStorage.setItem('mentor_email', mentorEmail);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mentorEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;
    window.open(gmailUrl, '_blank');
    showToast('Opening Gmail web compose...', 'info');
  };

  const sendMailto = () => {
    localStorage.setItem('mentor_email', mentorEmail);
    const mailtoUrl = `mailto:${encodeURIComponent(mentorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;
    window.open(mailtoUrl, '_blank');
    showToast('Opening system mail app...', 'info');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      showToast('📋 Report copied to clipboard!', 'success');
    });
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-card modal-lg">
        <div className="modal-header">
          <h2>📧 Daily Mentor Status Report Generator</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Mentor Email Address</label>
            <input
              type="email"
              value={mentorEmail}
              onChange={(e) => setMentorEmail(e.target.value)}
              placeholder="mentor@brototype.com"
            />
          </div>

          <div className="form-group">
            <label>Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Formatted Progress Report Preview</label>
            <textarea
              rows="12"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            ></textarea>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={copyToClipboard}>
            📋 Copy Text
          </button>
          <button className="btn btn-primary" onClick={sendGmail}>
            📩 Send via Gmail
          </button>
          <button className="btn btn-success" onClick={sendMailto}>
            ✉️ Open Mail App
          </button>
        </div>
      </div>
    </div>
  );
}
