import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from './ui/Spinner';
import { useAuth } from '../hooks/useAuth';

type ProtectedRouteProps = { children: ReactNode };
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  if (loading) return <main className="auth-page"><Spinner /></main>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
