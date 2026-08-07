import React, { useState } from 'react';
import { getApiUrl } from '../config/api';

export default function DocumentImportModal({ isOpen, onClose, onBatchImport, showToast, getAuthHeaders }) {
  const [docUrl, setDocUrl] = useState('');
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Settings for auto-pacing
  const [enableSchedule, setEnableSchedule] = useState(true);
  const [dailyHours, setDailyHours] = useState('2');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleFileUpload = (file) => {
    if (!file) return;
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1];
      fetch(getApiUrl('/api/pdf/import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ filename: file.name, pdf_base64: base64Data }),
      })
        .then((res) => res.json())
        .then((data) => {
          setIsLoading(false);
          if (data.success && data.tasks && data.tasks.length > 0) {
            setFilename(data.filename || file.name);
            setExtractedTasks(data.tasks);
            setShowPreview(true);
            showToast(`AI extracted ${data.tasks.length} topics from ${file.name}`, 'success');
          } else {
            showToast(data.error || 'Failed to extract document', 'error');
          }
        })
        .catch((err) => {
          setIsLoading(false);
          showToast('Error uploading document: ' + err.message, 'error');
        });
    };
    reader.readAsDataURL(file);
  };

  const handleUrlFetch = () => {
    if (!docUrl.trim()) {
      showToast('Please enter a Google Drive or Web document URL', 'error');
      return;
    }

    setIsLoading(true);
    fetch(getApiUrl('/api/pdf/import'), {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ doc_url: docUrl.trim() }),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsLoading(false);
        if (data.success && data.tasks && data.tasks.length > 0) {
          setFilename(data.filename || 'URL Document');
          setExtractedTasks(data.tasks);
          setShowPreview(true);
          showToast(`AI extracted ${data.tasks.length} topics from link`, 'success');
        } else {
          showToast(data.error || 'Failed to extract document link', 'error');
        }
      })
      .catch((err) => {
        setIsLoading(false);
        showToast('Error fetching URL: ' + err.message, 'error');
      });
  };

  const handleConfirmImport = () => {
    if (extractedTasks.length === 0) return;

    // Calculate auto pacing schedule
    let currentDate = startDate ? new Date(startDate) : new Date();
    if (isNaN(currentDate.getTime())) currentDate = new Date();

    let currentDayAccumulatedHours = 0;
    let dayCounter = 1;

    const scheduled = extractedTasks.map((t) => {
      const taskObj = { ...t };
      if (enableSchedule) {
        let taskHours = 1.0;
        if (t.duration.includes('30 min')) taskHours = 0.5;
        else if (t.duration.includes('1 hr')) taskHours = 1.0;
        else if (t.duration.includes('2 hr')) taskHours = 2.0;
        else if (t.duration.includes('3 hr')) taskHours = 3.0;

        const targetHours = parseFloat(dailyHours);
        if (currentDayAccumulatedHours + taskHours > targetHours && currentDayAccumulatedHours > 0) {
          currentDate.setDate(currentDate.getDate() + 1);
          currentDayAccumulatedHours = 0;
          dayCounter++;
        }

        const formattedDate = currentDate.toISOString().split('T')[0];
        taskObj.scheduled_time = `${formattedDate} (Day ${dayCounter})`;
        currentDayAccumulatedHours += taskHours;
      }
      return taskObj;
    });

    onBatchImport(scheduled);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-card modal-lg">
        <div className="modal-header">
          <h2>📂 PDF & Document Syllabus Importer</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!showPreview ? (
            <>
              <div
                className="drop-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.docx,.doc,.txt';
                  input.onchange = (e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                <div className="drop-zone-icon">📄</div>
                <div className="drop-zone-text">
                  Drag and drop <span>PDF, DOCX, or TXT</span> document here or click to browse
                </div>
              </div>

              <div style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '11px', color: '#94a3b8', margin: '16px 0', fontWeight: 700 }}>
                OR IMPORT FROM LINK
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="https://drive.google.com/file/d/... or Google Doc Link"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '13px' }}
                />
                <button className="btn btn-primary" onClick={handleUrlFetch}>
                  🔗 Fetch & Parse
                </button>
              </div>

              {isLoading && (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                  <div className="spinner"></div>
                  <p style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>Extracting topics & subtopics...</p>
                </div>
              )}
            </>
          ) : (
            <div>
              <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                Extracted <strong>{extractedTasks.length}</strong> topics & subtopics from <em>{filename}</em>:
              </p>

              <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '16px' }}>
                {extractedTasks.map((t, idx) => (
                  <div key={idx} className={`pdf-preview-item ${t.is_highlighted ? 'highlighted-topic' : ''}`}>
                    <div className="pdf-preview-info">
                      <div style={{ fontWeight: 600, color: t.is_highlighted ? '#fef08a' : '#f8fafc' }}>
                        {t.title}
                        {t.is_highlighted && <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '11px' }}>✨ AI Highlighted</span>}
                      </div>

                      {t.subtopics && t.subtopics.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '4px' }}>
                          <strong>Subtopics ({t.subtopics.length}):</strong> {t.subtopics.map(s => s.title).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enableSchedule}
                    onChange={(e) => setEnableSchedule(e.target.checked)}
                  />
                  Enable Automatic Study Roadmap Pacing & Scheduling
                </label>

                {enableSchedule && (
                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: '#94a3b8' }}>Daily Target Study Hours:</label>
                      <select value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} className="select-sm" style={{ width: '100%', marginTop: '4px' }}>
                        <option value="1">1 Hour / Day</option>
                        <option value="2">2 Hours / Day</option>
                        <option value="3">3 Hours / Day</option>
                        <option value="4">4 Hours / Day</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: '#94a3b8' }}>Start Date:</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', marginTop: '4px' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {showPreview && (
            <button className="btn btn-success" onClick={handleConfirmImport}>
              ✨ Confirm Batch Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
