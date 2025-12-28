import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documents, analysis as analysisAPI } from '../services/api';
import './Analysis.css';

const Analysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedClause, setExpandedClause] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadDocumentAndAnalysis();
  }, [id]);

  useEffect(() => {
    if (document && document.status === 'processing') {
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling for analysis progress...');
        loadDocumentAndAnalysis();
      }, 3000);

      return () => {
        console.log('🛑 Stopping poll interval');
        clearInterval(pollInterval);
      };
    }
  }, [document?.status]);

  const loadDocumentAndAnalysis = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔵 Loading document:', id);

      const docResponse = await documents.getById(id);
      console.log('✅ Document response:', docResponse);
      
      if (!docResponse || !docResponse.document) {
        throw new Error('Document not found');
      }

      setDocument(docResponse.document);

      if (docResponse.document.status === 'analyzed') {
        console.log('🔵 Document is analyzed, fetching analysis...');
        try {
          const analysisResponse = await analysisAPI.get(id);
          console.log('✅ Analysis response:', analysisResponse);
          
          if (analysisResponse && analysisResponse.analysis) {
            setAnalysis(analysisResponse.analysis);
          }
        } catch (analysisErr) {
          console.error('⚠️ Analysis fetch failed:', analysisErr);
        }
      }

    } catch (err) {
      console.error('❌ Load error:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError('');

      console.log('🚀 Starting analysis for document:', id);
      const response = await analysisAPI.start(id);
      console.log('✅ Analysis started:', response);

      await loadDocumentAndAnalysis();

    } catch (err) {
      console.error('❌ Analysis start error:', err);
      setError(err.message || 'Failed to start analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError('');
      console.log('🔄 Re-analyzing document:', id);
      
      await analysisAPI.start(id, true);
      await loadDocumentAndAnalysis();
      
    } catch (err) {
      console.error('❌ Re-analyze error:', err);
      setError(err.message || 'Failed to re-analyze');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddNote = async (clauseIndex) => {
    if (!noteText.trim()) return;

    try {
      console.log('📝 Adding note to clause:', clauseIndex);
      await analysisAPI.addNote(id, clauseIndex, noteText.trim());
      setNoteText('');
      setExpandedClause(null);
      await loadDocumentAndAnalysis();
    } catch (err) {
      console.error('❌ Add note error:', err);
      setError('Failed to add note: ' + err.message);
    }
  };

  const handleUpdateNote = async (clauseIndex, noteIndex, newText) => {
    if (!newText.trim()) return;

    try {
      console.log('✏️ Updating note:', clauseIndex, noteIndex);
      await analysisAPI.updateNote(id, clauseIndex, noteIndex, newText.trim());
      setEditingNote(null);
      await loadDocumentAndAnalysis();
    } catch (err) {
      console.error('❌ Update note error:', err);
      setError('Failed to update note: ' + err.message);
    }
  };

  const handleDeleteNote = async (clauseIndex, noteIndex) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      console.log('🗑️ Deleting note:', clauseIndex, noteIndex);
      await analysisAPI.deleteNote(id, clauseIndex, noteIndex);
      await loadDocumentAndAnalysis();
    } catch (err) {
      console.error('❌ Delete note error:', err);
      setError('Failed to delete note: ' + err.message);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      console.log('📄 Exporting PDF for document:', id);
      await analysisAPI.exportPdf(id);
      console.log('✅ PDF exported successfully');
    } catch (err) {
      console.error('❌ Export error:', err);
      setError('Failed to export PDF: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    try {
      console.log('⬇️ Downloading document:', document.originalName);
      await documents.download(id, document.originalName);
      console.log('✅ Download initiated');
    } catch (err) {
      console.error('❌ Download error:', err);
      setError('Failed to download document: ' + err.message);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical'
    };
    return colors[level?.toLowerCase()] || 'low';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="analysis-loading">
        <div className="spinner-large"></div>
        <p>Loading document...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="analysis-error">
        <h2>Document not found</h2>
        <p>The document you're looking for doesn't exist or you don't have access to it.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="analysis-container">
      {/* Header */}
      <header className="analysis-header">
        <div className="header-content">
          <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          
          <div className="header-info">
            <h1>{document.originalName}</h1>
            <div className="header-meta">
              <span>{document.fileType.toUpperCase()}</span>
              <span>•</span>
              <span>Uploaded {formatDate(document.uploadDate)}</span>
              {document.pageCount && (
                <>
                  <span>•</span>
                  <span>{document.pageCount} pages</span>
                </>
              )}
            </div>
          </div>

          <div className="header-actions">
            <button onClick={handleDownload} className="btn btn-secondary btn-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Download
            </button>
            
            {analysis && (
              <>
                <button 
                  onClick={() => {
                    if (window.confirm('Re-analyze this document? This will use fresh AI analysis instead of cached results.')) {
                      handleReAnalyze();
                    }
                  }}
                  disabled={analyzing}
                  className="btn btn-secondary btn-sm"
                >
                  {analyzing ? (
                    <>
                      <div className="spinner"></div>
                      Re-analyzing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                      Re-analyze
                    </>
                  )}
                </button>
                
                <button onClick={handleExportPDF} disabled={exporting} className="btn btn-primary btn-sm">
                  {exporting ? (
                    <>
                      <div className="spinner"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                      Export PDF
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="analysis-main">
        <div className="container">

          {error && (
            <div className="error-message">
              <button 
                onClick={() => setError('')}
                style={{ 
                  float: 'right', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: 'inherit'
                }}
              >
                ×
              </button>
              {error}
            </div>
          )}

          {/* Status Card */}
          {document.status !== 'analyzed' && (
            <div className="status-card">
              {document.status === 'uploaded' && (
                <>
                  <div className="status-icon status-icon-info">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="status-content">
                    <h3>Ready to Analyze</h3>
                    <p>This document has been uploaded but not yet analyzed. Click the button to start AI analysis.</p>
                  </div>
                  <button onClick={handleStartAnalysis} disabled={analyzing} className="btn btn-primary">
                    {analyzing ? 'Starting...' : 'Start Analysis'}
                  </button>
                </>
              )}

              {document.status === 'processing' && (
                <>
                  <div className="status-icon status-icon-processing">
                    <div className="spinner"></div>
                  </div>
                  <div className="status-content">
                    <h3>Analysis in Progress</h3>
                    <p>AI is analyzing your document. This may take a few minutes...</p>
                    {document.processingProgress > 0 && (
                      <>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${document.processingProgress}%` }}
                          />
                        </div>
                        <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {document.processingProgress}% complete
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}

              {document.status === 'error' && (
                <>
                  <div className="status-icon status-icon-error">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="status-content">
                    <h3>Analysis Failed</h3>
                    <p>{document.errorMessage || 'An error occurred during analysis. Please try again.'}</p>
                  </div>
                  <button onClick={handleStartAnalysis} className="btn btn-primary">
                    Retry Analysis
                  </button>
                </>
              )}
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Risk Score Card */}
              <div className="risk-score-card">
                <div className="risk-score-content">
                  <h3>Overall Risk Score</h3>
                  <div className={`risk-score risk-score-${getRiskColor(
                    analysis.overallRiskScore >= 80 ? 'critical' :
                    analysis.overallRiskScore >= 60 ? 'high' :
                    analysis.overallRiskScore >= 40 ? 'medium' : 'low'
                  )}`}>
                    {analysis.overallRiskScore}
                  </div>
                  <p className="risk-score-label">out of 100</p>
                </div>
                <div className="risk-score-stats">
                  <div className="stat-item">
                    <span className="stat-value">{analysis.clauses?.length || 0}</span>
                    <span className="stat-label">Clauses</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{analysis.risks?.length || 0}</span>
                    <span className="stat-label">Risks</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{analysis.keyFindings?.length || 0}</span>
                    <span className="stat-label">Key Findings</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="analysis-tabs">
                <button 
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`tab ${activeTab === 'clauses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('clauses')}
                >
                  Clauses ({analysis.clauses?.length || 0})
                </button>
                <button 
                  className={`tab ${activeTab === 'risks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('risks')}
                >
                  Risks ({analysis.risks?.length || 0})
                </button>
              </div>

              
              <div className="tab-content">
                
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="overview-content">
                    <section className="content-section">
                      <h3>Executive Summary</h3>
                      <p className="summary-text">{analysis.summary}</p>
                    </section>

                    {analysis.keyFindings && analysis.keyFindings.length > 0 && (
                      <section className="content-section">
                        <h3>Key Findings</h3>
                        <ul className="findings-list">
                          {analysis.keyFindings.map((finding, index) => (
                            <li key={index}>{finding}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                )}

                {/* Clauses Tab */}
                {activeTab === 'clauses' && (
                  <div className="clauses-content">
                    {analysis.clauses?.map((clause, index) => (
                      <div 
                        key={index} 
                        className="clause-card" 
                        data-risk={clause.riskLevel?.toLowerCase()}
                      >
                        <div className="clause-header">
                          <div className="clause-title">
                            <h4>{clause.type || 'Clause'}</h4>
                            <span className={`badge badge-risk-${getRiskColor(clause.riskLevel)}`}>
                              {clause.riskLevel}
                            </span>
                          </div>
                          <button 
                            className="expand-btn"
                            onClick={() => setExpandedClause(expandedClause === index ? null : index)}
                          >
                            <svg 
                              width="20" 
                              height="20" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              viewBox="0 0 24 24"
                              style={{ 
                                transform: expandedClause === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }}
                            >
                              <path d="M19 9l-7 7-7-7"/>
                            </svg>
                          </button>
                        </div>

                        <p className="clause-text">"{clause.text}"</p>
                        
                        <p className="clause-explanation">
                          <strong>Analysis:</strong> {clause.explanation}
                        </p>

                        {expandedClause === index && (
                          <div className="clause-notes">
                            <h5>Notes</h5>
                            
                            {clause.notes && clause.notes.length > 0 ? (
                              <div className="notes-list">
                                {clause.notes.map((note, noteIndex) => (
                                  <div key={noteIndex} className="note-item">
                                    {editingNote === `${index}-${noteIndex}` ? (
                                      <div className="note-edit">
                                        <textarea
                                          defaultValue={note.text}
                                          onBlur={(e) => {
                                            handleUpdateNote(index, noteIndex, e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleUpdateNote(index, noteIndex, e.target.value);
                                            }
                                          }}
                                          autoFocus
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <p>{note.text}</p>
                                        <div className="note-actions">
                                          <button 
                                            onClick={() => setEditingNote(`${index}-${noteIndex}`)}
                                            className="btn-icon"
                                          >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteNote(index, noteIndex)}
                                            className="btn-icon btn-icon-danger"
                                          >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-notes">No notes yet</p>
                            )}

                            <div className="add-note">
                              <textarea
                                placeholder="Add a note..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                rows="2"
                              />
                              <button 
                                onClick={() => handleAddNote(index)}
                                disabled={!noteText.trim()}
                                className="btn btn-primary btn-sm"
                              >
                                Add Note
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Risks Tab */}
                {activeTab === 'risks' && (
                  <div className="risks-content">
                    {analysis.risks?.map((risk, index) => (
                      <div key={index} className={`risk-card risk-${getRiskColor(risk.severity)}`}>
                        <div className="risk-header">
                          <span className={`badge badge-risk-${getRiskColor(risk.severity)}`}>
                            {risk.severity}
                          </span>
                          <h4>{risk.category}</h4>
                        </div>
                        <div className="risk-content">
                          <div className="risk-description">
                            <strong>Issue:</strong>
                            <p>{risk.description}</p>
                          </div>
                          <div className="risk-recommendation">
                            <strong>Recommendation:</strong>
                            <p>{risk.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default Analysis;