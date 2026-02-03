import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import FreeBoard from '../components/FreeBoard'
import '../styles/HomePage.css'

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
      <main className="dashboard-main">
        <FreeBoard />
      </main>
    </div>
  )
}

export default HomePage
