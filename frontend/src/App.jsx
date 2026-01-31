import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentPage from './pages/StudentPage';
import './App.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    if (token) {
      setIsAdmin(true);
      document.body.classList.add('admin-theme');
    } else {
      setIsAdmin(false);
      document.body.classList.remove('admin-theme');
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  return (
    <Router>
      <Header isAdmin={isAdmin} onLogout={handleLogout} />
      <div className="container">
        <Routes>
          <Route path="/" element={<StudentPage />} />
          <Route
            path="/login"
            element={!isAdmin ? <Login setToken={setToken} /> : <Navigate to="/admin" />}
          />
          <Route
            path="/admin"
            element={isAdmin ? <AdminDashboard token={token} /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
