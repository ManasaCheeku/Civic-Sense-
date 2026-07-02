import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Result from './pages/Result';
import History from './pages/History';
import Evidence from './pages/Evidence';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

// Layout Wrapper component to conditionally render Nav & Sidebar
const AppLayout = ({ children }) => {
  const { token } = useAuth();
  const location = useLocation();
  
  // Do not display navbar/sidebar on landing and login screens
  const isNoLayoutPage = ['/', '/login'].includes(location.pathname);

  if (isNoLayoutPage || !token) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-grow overflow-y-auto bg-slate-950/40">
          {children}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/upload" 
              element={
                <PrivateRoute>
                  <Upload />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/result" 
              element={
                <PrivateRoute>
                  <Result />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <PrivateRoute>
                  <History />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/evidence/:id" 
              element={
                <PrivateRoute>
                  <Evidence />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } 
            />
            
            {/* Authority/Admin Only Route */}
            <Route 
              path="/admin" 
              element={
                <PrivateRoute allowedRoles={['Authority', 'Admin']}>
                  <Admin />
                </PrivateRoute>
              } 
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
