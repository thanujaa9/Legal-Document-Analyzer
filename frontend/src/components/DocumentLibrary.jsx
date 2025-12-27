import React, { useState, useEffect } from 'react';
import './DocumentLibrary.css';
import { getAllDocuments, deleteDocument, downloadDocumentUrl } from '../services/api';
import AnalysisViewer from './AnalysisViewer';

const DocumentLibrary = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [analyzing, setAnalyzing] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [processingDocs, setProcessingDocs] = useState(new Set());
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [dialogDocId, setDialogDocId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [filterStatus]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm !== '') {
        fetchDocuments();
      }
    }, 500);
    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  useEffect(() => {
    if (processingDocs.size === 0) return;
    
    console.log(`🔄 Polling ${processingDocs.size} processing documents...`);
    
    const interval = setInterval(() => {
      fetchDocuments();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [processingDocs.size]);

  useEffect(() => {
    const processing = new Set(
      documents
        .filter(doc => doc.status === 'processing')
        .map(doc => doc._id)
    );
    setProcessingDocs(processing);
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      setLoading(processingDocs.size === 0);
      setError('');
      
      const data = await getAllDocuments({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchTerm || undefined
      });
      
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeClick = (docId, status) => {
    if (status === 'analyzed') {
      setDialogDocId(docId);
      setShowAnalysisDialog(true);
    } else {
      performAnalysis(docId, false);
    }
  };

  // ✅ MODIFIED: Handle cached vs fresh analysis differently
  const performAnalysis = async (docId, forceRefresh) => {
    setAnalyzing(docId);
    setShowAnalysisDialog(false);
    
    try {
      const token = localStorage.getItem('token');
      const url = forceRefresh 
        ? `http://localhost:8081/api/documents/${docId}/analyze?force=true`
        : `http://localhost:8081/api/documents/${docId}/analyze`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        if (data.fromCache || data.cached) {
          // ✅ CACHED: Open analysis viewer immediately
          console.log('⚡ Cached analysis - opening viewer');
          setSelectedDocumentId(docId);
          // No alert, just show the analysis
        } else {
          // ✅ FRESH: Show progress bar
          console.log('🔄 Fresh analysis - showing progress');
          alert('Analysis started! Progress will update in real-time.');
          
          setDocuments(prev => 
            prev.map(doc => 
              doc._id === docId 
                ? { 
                    ...doc, 
                    status: 'processing', 
                    processingProgress: 5 
                  }
                : doc
            )
          );
          
          setTimeout(() => fetchDocuments(), 1000);
        }
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(null);
    }
  };

  const handleViewAnalysis = (docId) => {
    setSelectedDocumentId(docId);
  };

  const handleExportPDF = async (docId, filename) => {
    setExporting(docId);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8081/api/documents/${docId}/analysis/export`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('Analysis report downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please analyze the document first.');
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const data = await deleteDocument(id);
      
      if (data.success) {
        setDocuments(prev => prev.filter(doc => doc._id !== id));
        alert('Document deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleDownload = (id, filename) => {
    const url = downloadDocumentUrl(id);
    window.open(url, '_blank');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    const badges = {
      uploaded: { color: '#3182ce', label: 'Ready' },
      processing: { color: '#d69e2e', label: 'Analyzing' },
      analyzed: { color: '#38a169', label: 'Complete' },
      error: { color: '#e53e3e', label: 'Error' }
    };
    
    const badge = badges[status] || badges.uploaded;
    
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: badge.color }}
      >
        {badge.label}
      </span>
    );
  };

  const getProgressMessage = (progress) => {
    if (progress < 15) return "Initializing AI analysis...";
    if (progress < 35) return "Extracting text from document...";
    if (progress < 55) return "Processing document structure...";
    if (progress < 75) return "AI analyzing clauses and risks...";
    if (progress < 95) return "Finalizing results...";
    return "Complete!";
  };

  if (loading) {
    return (
      <div className="library-container">
        <div className="loading">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="library-container">
        <div className="error">{error}</div>
        <button onClick={fetchDocuments}>Retry</button>
      </div>
    );
  }

  return (
    <div className="library-container">
      <div className="library-header">
        <h2>Document Library</h2>
        <div className="library-stats">
          <span>{documents.length} documents</span>
          {processingDocs.size > 0 && (
            <span style={{ marginLeft: '12px', color: '#d69e2e', fontWeight: 600 }}>
              • {processingDocs.size} processing
            </span>
          )}
        </div>
      </div>

      <div className="library-controls">
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="uploaded">Ready to Analyze</option>
          <option value="processing">Currently Analyzing</option>
          <option value="analyzed">Analysis Complete</option>
          <option value="error">Error</option>
        </select>

        <button onClick={fetchDocuments} className="refresh-btn">
          Refresh
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <p>No documents found</p>
          <span>Upload your first document to get started</span>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map(doc => (
            <div key={doc._id} className="document-card">
              <div className="card-header">
                <span className="file-type-badge">{doc.fileType.toUpperCase()}</span>
                {getStatusBadge(doc.status)}
              </div>

              <div className="card-body">
                <h3 className="doc-title">{doc.originalName}</h3>
                
                <div className="doc-meta">
                  <div className="meta-item">
                    <span className="meta-label">Size:</span>
                    <span className="meta-value">{formatFileSize(doc.fileSize)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Uploaded:</span>
                    <span className="meta-value">{formatDate(doc.uploadDate)}</span>
                  </div>
                </div>

                {doc.status === 'processing' && (
                  <div style={{
                    marginTop: '16px',
                    padding: '14px',
                    backgroundColor: '#fffbeb',
                    borderRadius: '8px',
                    border: '2px solid #fbbf24'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#92400e',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{getProgressMessage(doc.processingProgress || 0)}</span>
                      <span style={{ 
                        color: '#d97706', 
                        fontSize: '16px',
                        fontWeight: '700'
                      }}>
                        {doc.processingProgress || 0}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#fef3c7',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${doc.processingProgress || 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        transition: 'width 0.5s ease',
                        borderRadius: '4px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                          animation: 'shine 1.5s infinite'
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {doc.status === 'analyzed' && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#d1e7dd',
                    border: '1px solid #badbcc',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#0f5132'
                  }}>
                    Analysis complete! Click "Re-Analyze" to view cached or get fresh results.
                  </div>
                )}
              </div>

              <div className="card-actions">
                {doc.status !== 'processing' && (
                  <button
                    className={doc.status === 'analyzed' ? 'action-btn secondary-btn' : 'action-btn primary-btn'}
                    onClick={() => handleAnalyzeClick(doc._id, doc.status)}
                    disabled={analyzing === doc._id}
                  >
                    {analyzing === doc._id 
                      ? 'Starting...' 
                      : doc.status === 'analyzed'
                      ? 'Re-Analyze'
                      : 'Analyze Document'
                    }
                  </button>
                )}

                {doc.status === 'processing' && (
                  <button className="action-btn primary-btn" disabled>
                    Analyzing... {doc.processingProgress || 0}%
                  </button>
                )}

                {doc.status === 'analyzed' && (
                  <button
                    className="action-btn primary-btn"
                    onClick={() => handleViewAnalysis(doc._id)}
                  >
                    View Analysis
                  </button>
                )}
                
                {doc.status === 'analyzed' && (
                  <button
                    className="action-btn secondary-btn"
                    onClick={() => handleExportPDF(doc._id, doc.originalName)}
                    disabled={exporting === doc._id}
                  >
                    {exporting === doc._id ? 'Exporting...' : 'Export PDF'}
                  </button>
                )}
                
                <button
                  className="action-btn secondary-btn"
                  onClick={() => handleDownload(doc._id, doc.originalName)}
                >
                  Download
                </button>
                
                <button
                  className="action-btn danger-btn"
                  onClick={() => handleDelete(doc._id)}
                  disabled={doc.status === 'processing'}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAnalysisDialog && (
        <div className="dialog-overlay" onClick={() => setShowAnalysisDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>Re-Analyze Document</h3>
            <p>This document has already been analyzed. What would you like to do?</p>
            
            <div className="dialog-options">
              <button
                className="dialog-btn cached-btn"
                onClick={() => performAnalysis(dialogDocId, false)}
              >
                <div className="btn-icon">⚡</div>
                <div className="btn-content">
                  <div className="btn-title">View Cached Results</div>
                  <div className="btn-description">Instant • FREE • No tokens used</div>
                </div>
              </button>

              <button
                className="dialog-btn fresh-btn"
                onClick={() => performAnalysis(dialogDocId, true)}
              >
                <div className="btn-icon">🔄</div>
                <div className="btn-content">
                  <div className="btn-title">Fresh AI Analysis</div>
                  <div className="btn-description">~25 seconds • Costs tokens</div>
                </div>
              </button>
            </div>

            <button 
              className="dialog-cancel"
              onClick={() => setShowAnalysisDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedDocumentId && (
        <AnalysisViewer
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
        />
      )}

      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
};

export default DocumentLibrary;