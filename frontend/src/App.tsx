import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';

function ProtectedDashboard() {
  const { signOut } = useAuth();
  return <ProtectedRoute><Dashboard onLogout={signOut} /></ProtectedRoute>;
}

export function App() {
  return <BrowserRouter><Routes><Route path="/login" element={<Login />} /><Route path="/dashboard" element={<ProtectedDashboard />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></BrowserRouter>;
}
