import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import './App.css'

function HomePage() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <div className="home-container">
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        ☰
      </button>
      <nav className={`sidebar ${!sidebarOpen ? 'hidden' : ''}`}>
        <h1>Family Tree</h1>
        <div className="nav-content">
          <span>Welcome, {user?.firstName}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      </nav>
      <main>
        <h2>Home Page</h2>
        <p>Family tree layout will go here.</p>
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
