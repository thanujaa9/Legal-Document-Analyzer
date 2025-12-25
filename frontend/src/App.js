import React, { useEffect, useState } from 'react';
import './App.css';
import { checkHealth } from './services/api';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking...');

  useEffect(() => {
    // Test backend connection
    checkHealth()
      .then(data => {
        setBackendStatus('✅ Connected: ' + data.message);
      })
      .catch(error => {
        setBackendStatus('❌ Backend not connected');
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Legal Document Analyzer</h1>
        <p>AI-Powered Contract Analysis</p>
        <div style={{ 
          marginTop: '20px', 
          padding: '10px 20px', 
          background: backendStatus.includes('✅') ? '#28a745' : '#dc3545',
          color: 'white',
          borderRadius: '5px'
        }}>
          Backend Status: {backendStatus}
        </div>
      </header>
    </div>
  );
}

export default App;