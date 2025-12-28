import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documents, auth } from '../services/api';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    analyzed: 0,
    highRisk: 0,
    avgRiskScore: 0
  });
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);

      const allDocsResponse = await documents.getAll({ limit: 1000 });
      const allDocs = allDocsResponse.documents || [];

      const analyzedDocs = allDocs.filter(doc => doc.status === 'analyzed');
      const highRiskDocs = analyzedDocs.filter(doc => 
        doc.analysis?.overallRiskScore >= 60
      );
      
      const totalRiskScore = analyzedDocs.reduce((sum, doc) => 
        sum + (doc.analysis?.overallRiskScore || 0), 0
      );
      const avgRisk = analyzedDocs.length > 0 
        ? Math.round(totalRiskScore / analyzedDocs.length) 
        : 0;

      setStats({
        total: allDocs.length,
        analyzed: analyzedDocs.length,
        highRisk: highRiskDocs.length,
        avgRiskScore: avgRisk
      });

      const recentResponse = await documents.getAll({ 
        limit: 5, 
        sortBy: 'uploadDate', 
        sortOrder: 'desc' 
      });
      setRecentDocs(recentResponse.documents || []);

    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
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
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="home-loading">
        <div className="spinner-large"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">Legal Document Analyzer</h1>
            <p className="header-subtitle">AI-Powered Contract Analysis with Redis Cache & Bull Queue</p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.name || 'User'}</span>
                <span className="user-email">{user?.email || ''}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="container">
          
          <div className="welcome-section">
            <h2>Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
            <p>Here's an overview of your document analysis activity</p>
          </div>

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

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div className="stat-content">
                <p className="stat-label">Total Documents</p>
                <p className="stat-value">{stats.total}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div className="stat-content">
                <p className="stat-label">Analyzed</p>
                <p className="stat-value">{stats.analyzed}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-red">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div className="stat-content">
                <p className="stat-label">High Risk</p>
                <p className="stat-value">{stats.highRisk}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div className="stat-content">
                <p className="stat-label">Avg Risk Score</p>
                <p className="stat-value">{stats.avgRiskScore}</p>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              onClick={() => navigate('/upload')} 
              className="btn btn-primary btn-lg"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              Upload New Document
            </button>
            <button 
              onClick={() => navigate('/library')} 
              className="btn btn-secondary btn-lg"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
              View All Documents
            </button>
          </div>

          <section className="recent-section">
            <div className="section-header">
              <h3>Recent Documents</h3>
              <button 
                onClick={() => navigate('/library')}
                className="btn btn-secondary btn-sm"
              >
                View All
              </button>
            </div>

            {recentDocs.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h4>No documents yet</h4>
                <p>Upload your first legal document to get started with AI-powered analysis</p>
                <button 
                  onClick={() => navigate('/upload')} 
                  className="btn btn-primary"
                >
                  Upload Document
                </button>
              </div>
            ) : (
              <div className="documents-list">
                {recentDocs.map((doc) => (
                  <div key={doc._id} className="document-card">
                    <div className="doc-icon">
                      {doc.fileType === 'pdf' ? (
                        <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                          <path d="M14 2v6h6M9 13h6M9 17h6"/>
                        </svg>
                      ) : (
                        <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                          <path d="M14 2v6h6M10 13h4M10 17h4"/>
                        </svg>
                      )}
                    </div>

                    <div className="doc-info">
                      <h4 className="doc-name">{doc.originalName}</h4>
                      <div className="doc-meta">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.uploadDate)}</span>
                      </div>
                    </div>

                    <div className="doc-status">
                      <span className={`badge badge-${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                      {doc.status === 'analyzed' && doc.analysis?.overallRiskScore !== undefined && (
                        <span className={`badge badge-risk-${getRiskColor(doc.analysis.overallRiskScore)}`}>
                          Risk: {doc.analysis.overallRiskScore}
                        </span>
                      )}
                    </div>

                    <div className="doc-actions">
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
                          Analyze Now
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" disabled>
                          {doc.status === 'processing' ? 'Processing...' : 'Error'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default Home;
