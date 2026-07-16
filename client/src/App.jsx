import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('hx_admin_token'));

  const updateToken = (newToken) => {
    if (newToken) {
      sessionStorage.setItem('hx_admin_token', newToken);
    } else {
      sessionStorage.removeItem('hx_admin_token');
    }
    setToken(newToken);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        
        <Route 
          path="/admin/login" 
          element={<AdminLogin token={token} setToken={updateToken} />} 
        />
        
        <Route 
          path="/admin/dashboard" 
          element={
            token ? (
              <AdminDashboard token={token} setToken={updateToken} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;