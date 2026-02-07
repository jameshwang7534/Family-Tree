import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useTree } from './context/TreeContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import { SelectTreePage } from './pages/SelectTreePage'
import { ProtectedRoute } from './components/ProtectedRoute'
import './App.css'

function BoardOrSelectTree() {
  const { selectedTreeId, loading } = useTree()
  if (loading) return <div className="loading">Loading...</div>
  if (selectedTreeId) return <HomePage />
  return <Navigate to="/select-tree" replace />
}

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BoardOrSelectTree />
          </ProtectedRoute>
        }
      />
      <Route
        path="/select-tree"
        element={
          <ProtectedRoute>
            <SelectTreePage />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/select-tree" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/select-tree" replace /> : <RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
