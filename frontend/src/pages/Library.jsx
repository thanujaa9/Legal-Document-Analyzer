import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documents } from '../services/api';
import './Library.css';

const Library = () => {
  const navigate = useNavigate();
  
  const [allDocuments, setAllDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('uploadDate');
  const [sortOrder, setSortOrder] = useState('desc');
  

  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allDocuments, searchQuery, statusFilter, sortBy, sortOrder]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('📚 Loading all documents...');
      const response = await documents.getAll({ limit: 1000 });
      console.log('✅ Documents loaded:', response);

      setAllDocuments(response.documents || []);
    } catch (err) {
      console.error('❌ Load documents error:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allDocuments];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(doc =>
        doc.originalName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.originalName.toLowerCase();
          bVal = b.originalName.toLowerCase();
          break;
        case 'size':
          aVal = a.fileSize;
          bVal = b.fileSize;
          break;
        case 'risk':
          aVal = a.analysis?.overallRiskScore || 0;
          bVal = b.analysis?.overallRiskScore || 0;
          break;
        case 'uploadDate':
        default:
          aVal = new Date(a.uploadDate);
          bVal = new Date(b.uploadDate);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredDocs(filtered);
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Delete "${docName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(docId);
      console.log('🗑️ Deleting document:', docId);

      await documents.delete(docId);
      console.log('✅ Document deleted');

      // Remove from local state
      setAllDocuments(prev => prev.filter(doc => doc._id !== docId));
    } catch (err) {
      console.error('❌ Delete error:', err);
      setError(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc) => {
    try {
      console.log('⬇️ Downloading:', doc.originalName);
      await documents.download(doc._id, doc.originalName);
    } catch (err) {
      console.error('❌ Download error:', err);
      setError(`Failed to download: ${err.message}`);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const getStatusBadge = (status) => {
    const badges = {
      uploaded: 'info',
      processing: 'warning',
      analyzed: 'success',
      error: 'error'
    };
    return badges[status] || 'info';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="library-loading">
        <div className="spinner-large"></div>
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="library-container">
    
      <header className="library-header">
        <div className="header-content">
          <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </button>
          <div className="header-info">
            <h1>Document Library</h1>
            <p>{filteredDocs.length} of {allDocuments.length} documents</p>
          </div>
          <button 
            onClick={() => navigate('/upload')} 
            className="btn btn-primary btn-sm"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4"/>
            </svg>
            Upload New
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="library-main">
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

          {/* Filters Bar */}
          <div className="filters-bar">
            {/* Search */}
            <div className="search-box">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-search">
                  ×
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="analyzed">Analyzed</option>
              <option value="error">Error</option>
            </select>

            {/* Sort By */}
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="uploadDate">Upload Date</option>
              <option value="name">Name</option>
              <option value="size">File Size</option>
              <option value="risk">Risk Score</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary btn-sm"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <svg 
                width="16" 
                height="16" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
                style={{ 
                  transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
              </svg>
            </button>
          </div>

          {/* Documents List */}
          {filteredDocs.length === 0 ? (
            <div className="empty-state">
              {searchQuery || statusFilter !== 'all' ? (
                <>
                  <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <h3>No documents found</h3>
                  <p>Try adjusting your filters or search query</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="btn btn-secondary"
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <h3>No documents yet</h3>
                  <p>Upload your first legal document to get started</p>
                  <button 
                    onClick={() => navigate('/upload')}
                    className="btn btn-primary"
                  >
                    Upload Document
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="documents-grid">
              {filteredDocs.map((doc) => (
                <div key={doc._id} className="library-doc-card">
                  <div className="doc-card-header">
                    <div className="doc-icon-large">
                      {doc.fileType === 'pdf' ? (
                        <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                          <path d="M14 2v6h6M9 13h6M9 17h6"/>
                        </svg>
                      ) : (
                        <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                          <path d="M14 2v6h6M10 13h4M10 17h4"/>
                        </svg>
                      )}
                    </div>
                    <div className="doc-badges">
                      <span className={`badge badge-${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                      {doc.status === 'analyzed' && doc.analysis?.overallRiskScore !== undefined && (
                        <span className={`badge badge-risk-${getRiskColor(doc.analysis.overallRiskScore)}`}>
                          {doc.analysis.overallRiskScore}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="doc-card-body">
                    <h3 className="doc-card-title">{doc.originalName}</h3>
                    <div className="doc-card-meta">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{doc.fileType.toUpperCase()}</span>
                      {doc.pageCount && (
                        <>
                          <span>•</span>
                          <span>{doc.pageCount} pages</span>
                        </>
                      )}
                    </div>
                    <p className="doc-card-date">
                      Uploaded {formatDate(doc.uploadDate)}
                    </p>
                  </div>

                  <div className="doc-card-footer">
                    {doc.status === 'analyzed' ? (
                      <button
                        onClick={() => navigate(`/analysis/${doc._id}`)}
                        className="btn btn-primary btn-sm"
                      >
                        View Analysis
                      </button>
                    ) : doc.status === 'uploaded' ? (
                      <button
                        onClick={() => navigate(`/analysis/${doc._id}`)}
                        className="btn btn-secondary btn-sm"
                      >
                        Analyze
                      </button>
                    ) : doc.status === 'processing' ? (
                      <button className="btn btn-secondary btn-sm" disabled>
                        <div className="spinner"></div>
                        Processing...
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/analysis/${doc._id}`)}
                        className="btn btn-secondary btn-sm"
                      >
                        Retry
                      </button>
                    )}

                    <div className="doc-card-actions">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="btn-icon"
                        title="Download"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(doc._id, doc.originalName)}
                        className="btn-icon btn-icon-danger"
                        title="Delete"
                        disabled={deletingId === doc._id}
                      >
                        {deletingId === doc._id ? (
                          <div className="spinner"></div>
                        ) : (
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Library;