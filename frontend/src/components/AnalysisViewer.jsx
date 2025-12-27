import React, { useState, useEffect } from 'react';
import './AnalysisViewer.css';

const API_BASE_URL = 'http://localhost:8081/api';

const AnalysisViewer = ({ documentId, onClose }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeNoteInput, setActiveNoteInput] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Get auth token helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    fetchAnalysis();
  }, [documentId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/analysis`,
        { headers: getAuthHeaders() }
      );
      
      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.message || 'No analysis found');
      }
    } catch (err) {
      setError('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (clauseIndex) => {
    if (!noteText.trim()) {
      alert('⚠️ Please enter a note');
      return;
    }

    setSavingNote(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/analysis/clauses/${clauseIndex}/notes`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ noteText: noteText.trim() })
        }
      );

      const data = await response.json();

      if (data.success) {
        // ✅ Refetch entire analysis to get updated data
        await fetchAnalysis();
        
        setNoteText('');
        setActiveNoteInput(null);
        alert('✅ Note added successfully');
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Add note error:', error);
      alert('❌ Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (clauseIndex, noteIndex) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/analysis/clauses/${clauseIndex}/notes/${noteIndex}`,
        { 
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      const data = await response.json();

      if (data.success) {
        // ✅ Refetch entire analysis to get updated data
        await fetchAnalysis();
        alert('✅ Note deleted');
      }
    } catch (error) {
      console.error('Delete note error:', error);
      alert('❌ Failed to delete note');
    }
  };

  const getRiskClass = (level) => {
    const normalizedLevel = level?.toLowerCase();
    switch (normalizedLevel) {
      case 'high':
      case 'critical':
        return 'clause-high';
      case 'medium':
        return 'clause-medium';
      case 'low':
        return 'clause-low';
      default:
        return 'clause-default';
    }
  };

  const getRiskBadgeClass = (level) => {
    const normalizedLevel = level?.toLowerCase();
    switch (normalizedLevel) {
      case 'high':
      case 'critical':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
        return 'badge-low';
      default:
        return 'badge-default';
    }
  };

  const getRiskIcon = (level) => {
    const icons = {
      low: '✅',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨'
    };
    return icons[level?.toLowerCase()] || '📋';
  };

  const getOverallRiskClass = (score) => {
    if (score > 70) return 'risk-critical';
    if (score > 40) return 'risk-medium';
    return 'risk-low';
  };

  if (loading) {
    return (
      <div className="analysis-overlay">
        <div className="analysis-modal">
          <div className="loading-state">⏳ Loading analysis...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-overlay">
        <div className="analysis-modal">
          <div className="error-state">
            <h3>❌ {error}</h3>
            <button onClick={onClose} className="btn-close">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-overlay" onClick={onClose}>
      <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Document Analysis</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <div className="modal-content">
          {/* Overall Risk Score */}
          <div className="risk-score-section">
            <h3>Overall Risk Score</h3>
            <div className="score-display">
              <span className={`score-value ${getOverallRiskClass(analysis.overallRiskScore)}`}>
                {analysis.overallRiskScore}
              </span>
              <span className="score-label">/ 100</span>
            </div>
          </div>

          {/* Summary */}
          <div className="content-section">
            <h3>📝 Summary</h3>
            <p className="summary-text">{analysis.summary}</p>
          </div>

          {/* Key Findings */}
          {analysis.keyFindings && analysis.keyFindings.length > 0 && (
            <div className="content-section">
              <h3>🔍 Key Findings</h3>
              <ul className="findings-list">
                {analysis.keyFindings.map((finding, idx) => (
                  <li key={idx} className="finding-item">{finding}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Identified Risks */}
          <div className="content-section">
            <h3>⚠️ Identified Risks ({analysis.risks.length})</h3>
            <div className="risks-grid">
              {analysis.risks.map((risk, idx) => (
                <div key={idx} className="risk-card">
                  <div className="risk-header">
                    <span className="risk-icon">{getRiskIcon(risk.severity)}</span>
                    <span className={`risk-badge ${getRiskBadgeClass(risk.severity)}`}>
                      {risk.severity.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="risk-category">{risk.category}</h4>
                  <p className="risk-description">{risk.description}</p>
                  <div className="risk-recommendation">
                    <strong>💡 Recommendation:</strong>
                    <p>{risk.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clauses */}
          <div className="content-section">
            <h3>📋 Extracted Clauses ({analysis.clauses.length})</h3>
            
            <div className="risk-legend">
              <span className="legend-item legend-high">High Risk</span>
              <span className="legend-item legend-medium">Medium Risk</span>
              <span className="legend-item legend-low">Low Risk</span>
            </div>

            <div className="clauses-container">
              {analysis.clauses.map((clause, idx) => (
                <div key={idx} className={`clause-card ${getRiskClass(clause.riskLevel)}`}>
                  <div className="clause-header">
                    <span className="clause-type">{clause.type}</span>
                    <span className={`clause-badge ${getRiskBadgeClass(clause.riskLevel)}`}>
                      {clause.riskLevel}
                    </span>
                  </div>
                  <p className="clause-text">"{clause.text}"</p>
                  <p className="clause-explanation">{clause.explanation}</p>

                  {/* Notes Section */}
                  <div className="notes-section">
                    <div className="notes-header">
                      <strong>📝 Notes ({clause.notes?.length || 0})</strong>
                      <button
                        onClick={() => setActiveNoteInput(activeNoteInput === idx ? null : idx)}
                        className="btn-add-note"
                      >
                        {activeNoteInput === idx ? '✕ Cancel' : '➕ Add Note'}
                      </button>
                    </div>

                    {/* Existing Notes */}
                    {clause.notes && clause.notes.length > 0 && (
                      <div className="notes-list">
                        {clause.notes.map((note, noteIdx) => (
                          <div key={noteIdx} className="note-item">
                            <div className="note-content">
                              <p className="note-text">{note.text}</p>
                              <span className="note-date">
                                {new Date(note.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(idx, noteIdx)}
                              className="btn-delete-note"
                              title="Delete note"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Note Input */}
                    {activeNoteInput === idx && (
                      <div className="note-input-container">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Enter your note here..."
                          className="note-textarea"
                          rows={3}
                          autoFocus
                        />
                        <div className="note-actions">
                          <button
                            onClick={() => handleAddNote(idx)}
                            disabled={savingNote}
                            className="btn-save-note"
                          >
                            {savingNote ? '⏳ Saving...' : '💾 Save Note'}
                          </button>
                          <button
                            onClick={() => {
                              setActiveNoteInput(null);
                              setNoteText('');
                            }}
                            className="btn-cancel-note"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="metadata-section">
            <div className="meta-item">
              <span className="meta-label">🤖 AI Model:</span>
              <span className="meta-value">{analysis.aiModel}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">🎯 Tokens Used:</span>
              <span className="meta-value">{analysis.tokensUsed}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">📅 Analyzed:</span>
              <span className="meta-value">{new Date(analysis.analyzedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisViewer;