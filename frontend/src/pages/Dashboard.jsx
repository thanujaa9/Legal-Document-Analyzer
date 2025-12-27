import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import DocumentLibrary from '../components/DocumentLibrary';
import './Dashboard.css';

const Dashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>⚖️ Legal Document Analyzer</h1>
          <div className="user-info">
            <span>👤 {user.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <FileUpload onUploadSuccess={handleUploadSuccess} />
        <DocumentLibrary key={refreshKey} />
      </main>
    </div>
  );
};

export default Dashboard;