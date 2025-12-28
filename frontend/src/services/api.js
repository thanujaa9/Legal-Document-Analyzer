const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const getToken = () => localStorage.getItem('token');

const getHeaders = (isFormData = false) => {
  const headers = {};
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

export const auth = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    return handleResponse(response);
  },
  
  signup: async (name, email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password })
    });
    return handleResponse(response);
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

export const documents = {
  upload: async (files, onProgress) => {
    const formData = new FormData();
    
    for (let file of files) {
      formData.append('documents', file);
    }
    
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    
    return handleResponse(response);
  },
  
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const response = await fetch(
      `${API_BASE_URL}/documents?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );
    
    return handleResponse(response);
  },
  
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  download: async (id, originalName) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  
  getStreamUrl: (id) => {
    return `${API_BASE_URL}/documents/${id}/stream?token=${getToken()}`;
  }
};

export const analysis = {
  start: async (documentId, forceRefresh = false) => {
    const url = forceRefresh 
      ? `${API_BASE_URL}/documents/${documentId}/analyze?force=true`
      : `${API_BASE_URL}/documents/${documentId}/analyze`;
      
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  get: async (documentId) => {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/analysis`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  addNote: async (documentId, clauseIndex, noteText) => {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/analysis/clauses/${clauseIndex}/notes`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ noteText })
      }
    );
    return handleResponse(response);
  },
  
  updateNote: async (documentId, clauseIndex, noteIndex, noteText) => {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/analysis/clauses/${clauseIndex}/notes/${noteIndex}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ noteText })
      }
    );
    return handleResponse(response);
  },
  
  deleteNote: async (documentId, clauseIndex, noteIndex) => {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/analysis/clauses/${clauseIndex}/notes/${noteIndex}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );
    return handleResponse(response);
  },
  
  exportPdf: async (documentId) => {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/analysis/export`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${documentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

export const dashboard = {
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  getRecentDocuments: async (limit = 5) => {
    return documents.getAll({ 
      limit, 
      sortBy: 'uploadDate', 
      sortOrder: 'desc' 
    });
  }
};

export default API_BASE_URL;
