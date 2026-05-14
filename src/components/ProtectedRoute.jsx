import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'

export function ProtectedRoute({ children }) {
  const user = useAppStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export function AdminRoute({ children }) {
  const user = useAppStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.app_metadata?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
