import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTree } from '../context/TreeContext'
import FreeBoard from '../components/FreeBoard'
import { SettingsView } from '../components/SettingsView'
import '../styles/HomePage.css'

function HomePage() {
  const { user, logout } = useAuth()
  const { clearSelection } = useTree()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  const handleLogout = async () => {
    await logout()
    clearSelection()
  }

  return (
    <div className="home-container">
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        ☰
      </button>
      <nav className={`sidebar ${!sidebarOpen ? 'hidden' : ''}`}>
        <h1>Family Tree</h1>
        <div className="nav-content">
          <span>Welcome, {user?.firstName}!</span>
          <button type="button" onClick={() => setShowSettingsModal(true)}>
            Settings
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main className="dashboard-main">
        <FreeBoard />
      </main>
      {showSettingsModal && (
        <SettingsView onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  )
}

export default HomePage
