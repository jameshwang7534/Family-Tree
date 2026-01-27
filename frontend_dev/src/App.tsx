import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import './App.css'

function HomePage() {
  const { user, logout } = useAuth()

  return (
    <div className="home-container">
      <nav className="navbar">
        <h1>Family Tree</h1>
        <div className="nav-right">
          <span>Welcome, {user?.firstName}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      </nav>
      <main>
        <h2>Home Page</h2>
        <p>Family tree content will go here.</p>
      </main>
    </div>
  )
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
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
