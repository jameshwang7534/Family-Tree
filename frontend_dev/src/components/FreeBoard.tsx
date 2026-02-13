import { useState, useRef, useEffect } from 'react'
import ProfileCard from './ProfileCard'
import EditProfileModal from './EditProfileModal'
import RelationshipInputModal from './RelationshipInputModal'
import ConnectionLine from './ConnectionLine'
import { TreeTabsBar, TREE_TABS_BAR_HEIGHT } from './TreeTabsBar'
import { AddTreeModal } from './AddTreeModal'
import { useTree } from '../context/TreeContext'
import { treeService } from '../services/treeService'
import type { Profile, Connection } from '../types'
import '../styles/FreeBoard.css'

const PROFILES_STORAGE_PREFIX = 'family-tree-profiles-'
const NEXT_ID_STORAGE_PREFIX = 'family-tree-next-id-'
const CONNECTIONS_STORAGE_PREFIX = 'family-tree-connections-'
const CONNECTION_NEXT_ID_STORAGE_PREFIX = 'family-tree-connection-next-id-'

function getProfilesKey(treeId: string) {
  return `${PROFILES_STORAGE_PREFIX}${treeId}`
}

function getNextIdKey(treeId: string) {
  return `${NEXT_ID_STORAGE_PREFIX}${treeId}`
}

function getConnectionsKey(treeId: string) {
  return `${CONNECTIONS_STORAGE_PREFIX}${treeId}`
}

function getConnectionNextIdKey(treeId: string) {
  return `${CONNECTION_NEXT_ID_STORAGE_PREFIX}${treeId}`
}

function loadConnectionsForTree(treeId: string): Connection[] {
  try {
    const raw = localStorage.getItem(getConnectionsKey(treeId))
    if (raw) {
      const parsed = JSON.parse(raw) as Connection[]
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {
    // ignore
  }
  return []
}

function loadConnectionNextIdForTree(treeId: string): number {
  try {
    const raw = localStorage.getItem(getConnectionNextIdKey(treeId))
    if (raw) {
      const n = parseInt(raw, 10)
      if (Number.isFinite(n)) return n
    }
  } catch {
    // ignore
  }
  return 1
}

function loadProfilesForTree(treeId: string): Profile[] {
  try {
    const raw = localStorage.getItem(getProfilesKey(treeId))
    if (raw) {
      const parsed = JSON.parse(raw) as Profile[]
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {
    // ignore
  }
  return []
}

function loadNextIdForTree(treeId: string): number {
  try {
    const raw = localStorage.getItem(getNextIdKey(treeId))
    if (raw) {
      const n = parseInt(raw, 10)
      if (Number.isFinite(n)) return n
    }
  } catch {
    // ignore
  }
  return 1
}

function FreeBoard() {
  const { selectedTreeId, trees, setSelectedTreeId, refreshTrees } = useTree()
  const [showAddTreeModal, setShowAddTreeModal] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [nextId, setNextId] = useState(1)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isCardDraggingRef = useRef(false)
  const skipNextPersistRef = useRef(false)
  
  // Connection state
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionNextId, setConnectionNextId] = useState(1)
  const [connectionModeSourceId, setConnectionModeSourceId] = useState<string | null>(null)
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null)
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null)

  // Load this tree's board when selected tree changes
  useEffect(() => {
    if (!selectedTreeId) return
    setProfiles(loadProfilesForTree(selectedTreeId))
    setNextId(loadNextIdForTree(selectedTreeId))
    setConnections(loadConnectionsForTree(selectedTreeId))
    setConnectionNextId(loadConnectionNextIdForTree(selectedTreeId))
    setEditingProfileId(null)
    setConnectionModeSourceId(null)
    setEditingConnectionId(null)
    setPendingTargetId(null)
    setPanOffset({ x: 0, y: 0 })
    setZoom(1)
    skipNextPersistRef.current = true
    const t = setTimeout(() => {
      skipNextPersistRef.current = false
    }, 0)
    return () => clearTimeout(t)
  }, [selectedTreeId])

  // Persist this tree's profiles (skip first run after load so we don't overwrite with empty state)
  useEffect(() => {
    if (!selectedTreeId || skipNextPersistRef.current) return
    localStorage.setItem(getProfilesKey(selectedTreeId), JSON.stringify(profiles))
  }, [selectedTreeId, profiles])

  // Persist this tree's next id (skip first run after load)
  useEffect(() => {
    if (!selectedTreeId || skipNextPersistRef.current) return
    localStorage.setItem(getNextIdKey(selectedTreeId), String(nextId))
  }, [selectedTreeId, nextId])

  // Persist this tree's connections (skip first run after load)
  useEffect(() => {
    if (!selectedTreeId || skipNextPersistRef.current) return
    localStorage.setItem(getConnectionsKey(selectedTreeId), JSON.stringify(connections))
  }, [selectedTreeId, connections])

  // Persist this tree's connection next id (skip first run after load)
  useEffect(() => {
    if (!selectedTreeId || skipNextPersistRef.current) return
    localStorage.setItem(getConnectionNextIdKey(selectedTreeId), String(connectionNextId))
  }, [selectedTreeId, connectionNextId])

  const handleAddProfile = () => {
    const newProfile: Profile = {
      id: `profile-${nextId}`,
      name: '',
      relationship: '',
      age: 0,
      gender: '',
      birthDate: '',
      story: '',
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    }
    setProfiles([...profiles, newProfile])
    setNextId(nextId + 1)
  }

  const handleUpdateProfile = (id: string, updates: Partial<Profile>) => {
    setProfiles(profiles.map(profile =>
      profile.id === id ? { ...profile, ...updates } : profile
    ))
  }

  const editingProfile = editingProfileId
    ? (profiles.find(p => p.id === editingProfileId) ?? null)
    : null
  const handleSaveEdit = (updates: Partial<Profile>) => {
    if (editingProfileId) {
      handleUpdateProfile(editingProfileId, updates)
      setEditingProfileId(null)
    }
  }

  const handleDeleteProfile = (id: string) => {
    setProfiles(profiles.filter(profile => profile.id !== id))
    // Also delete all connections involving this profile
    setConnections(connections.filter(
      conn => conn.fromCardId !== id && conn.toCardId !== id
    ))
  }

  const handleCardDragStart = () => {
    isCardDraggingRef.current = true
  }

  const handleCardDragEnd = () => {
    isCardDraggingRef.current = false
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest('.profile-card') ||
      target.closest('.add-button') ||
      target.closest('.tree-tabs-bar') ||
      target.closest('.connection-label') ||
      target.closest('svg')
    ) {
      return
    }

    // Cancel connection mode if clicking on canvas background
    if (connectionModeSourceId) {
      setConnectionModeSourceId(null)
      setPendingTargetId(null)
    }

    // Only pan if clicking on the canvas background (not on a card)
    if (canvasRef.current && !target.closest('.profile-card')) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      canvasRef.current.setPointerCapture(e.pointerId)
      e.preventDefault()
    }
  }

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isPanning && !isCardDraggingRef.current && canvasRef.current) {
        const newX = e.clientX - panStart.x
        const newY = e.clientY - panStart.y
        setPanOffset({ x: newX, y: newY })
        e.preventDefault()
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (isPanning && canvasRef.current) {
        setIsPanning(false)
        canvasRef.current.releasePointerCapture(e.pointerId)
      }
    }

    if (isPanning) {
      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
      // Prevent text selection during pan
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.body.style.userSelect = ''
    }
  }, [isPanning, panStart])

  const handleWheel = (e: React.WheelEvent) => {
    // Don't zoom if scrolling on a card or modal
    const target = e.target as HTMLElement
    if (
      target.closest('.profile-card') ||
      target.closest('.modal-overlay') ||
      target.closest('.relationship-modal-overlay')
    ) {
      return
    }

    e.preventDefault()
    
    const MIN_ZOOM = 0.25
    const MAX_ZOOM = 3
    const ZOOM_SENSITIVITY = 0.1

    // Calculate zoom delta
    const delta = e.deltaY > 0 ? -ZOOM_SENSITIVITY : ZOOM_SENSITIVITY
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))

    if (newZoom === zoom) return

    // Get mouse position relative to canvas
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Calculate the point in canvas coordinates before zoom
      const canvasX = (mouseX - panOffset.x) / zoom
      const canvasY = (mouseY - panOffset.y) / zoom

      // Calculate new pan offset to keep the point under mouse fixed
      const newPanX = mouseX - canvasX * newZoom
      const newPanY = mouseY - canvasY * newZoom

      setZoom(newZoom)
      setPanOffset({ x: newPanX, y: newPanY })
    }
  }

  const handleAddTreeSubmit = async (payload: {
    name: string
    description: string
    icon_url: string
  }) => {
    const created = await treeService.createTree({
      name: payload.name,
      description: payload.description || undefined,
      icon_url: payload.icon_url || undefined,
    })
    await refreshTrees()
    setSelectedTreeId(created.id)
    setShowAddTreeModal(false)
  }

  // Connection handlers
  const handleConnectClick = (profileId: string) => {
    // If clicking Connect on the same card that's already in connection mode, cancel it
    if (connectionModeSourceId === profileId) {
      setConnectionModeSourceId(null)
      setPendingTargetId(null)
      setEditingConnectionId(null)
    } else {
      setConnectionModeSourceId(profileId)
      setPendingTargetId(null)
      setEditingConnectionId(null)
    }
  }

  const handleConnectionTargetClick = (targetId: string) => {
    if (!connectionModeSourceId) return
    
    // Prevent self-connection
    if (connectionModeSourceId === targetId) {
      alert('Cannot connect a profile to itself')
      return
    }

    // Check for existing connection
    const existingConnection = connections.find(
      conn => conn.fromCardId === connectionModeSourceId && conn.toCardId === targetId
    )

    if (existingConnection) {
      // Edit existing connection
      setEditingConnectionId(existingConnection.id)
      setPendingTargetId(targetId)
    } else {
      // Create new connection
      setPendingTargetId(targetId)
    }
  }

  const handleSaveConnection = (relationshipText: string) => {
    if (!connectionModeSourceId || !pendingTargetId) return

    if (editingConnectionId) {
      // Update existing connection
      setConnections(connections.map(conn =>
        conn.id === editingConnectionId
          ? { ...conn, relationshipText }
          : conn
      ))
      setEditingConnectionId(null)
    } else {
      // Create new connection
      const newConnection: Connection = {
        id: `connection-${connectionNextId}`,
        fromCardId: connectionModeSourceId,
        toCardId: pendingTargetId,
        relationshipText,
      }
      setConnections([...connections, newConnection])
      setConnectionNextId(connectionNextId + 1)
    }

    setConnectionModeSourceId(null)
    setPendingTargetId(null)
  }

  const handleCancelConnection = () => {
    setConnectionModeSourceId(null)
    setPendingTargetId(null)
    setEditingConnectionId(null)
  }

  const handleEditConnection = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (connection) {
      setEditingConnectionId(connectionId)
      setConnectionModeSourceId(connection.fromCardId)
      setPendingTargetId(connection.toCardId)
    }
  }

  const handleDeleteConnection = (connectionId: string) => {
    setConnections(connections.filter(conn => conn.id !== connectionId))
    setEditingConnectionId(null)
    setConnectionModeSourceId(null)
    setPendingTargetId(null)
  }

  const editingConnection = editingConnectionId
    ? connections.find(c => c.id === editingConnectionId) ?? null
    : null

  return (
    <div className="free-board free-board-with-tabs">
      <div
        ref={canvasRef}
        className={`board-canvas ${isPanning ? 'panning' : ''} ${connectionModeSourceId ? 'connection-mode' : ''}`}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        style={{ 
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* SVG overlay for connections */}
        <svg
          className="connections-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            overflow: 'visible',
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#667eea" />
            </marker>
          </defs>
          {connections.map(connection => {
            const fromProfile = profiles.find(p => p.id === connection.fromCardId)
            const toProfile = profiles.find(p => p.id === connection.toCardId)
            if (!fromProfile || !toProfile) return null
            return (
              <ConnectionLine
                key={connection.id}
                connection={connection}
                fromProfile={fromProfile}
                toProfile={toProfile}
                onEdit={handleEditConnection}
              />
            )
          })}
        </svg>
        {connectionModeSourceId && (
          <div className="connection-mode-hint">
            Select a target card to connect
          </div>
        )}
        {profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onUpdate={handleUpdateProfile}
            onDelete={handleDeleteProfile}
            onEditClick={() => setEditingProfileId(profile.id)}
            onDragStart={handleCardDragStart}
            onDragEnd={handleCardDragEnd}
            onConnectClick={() => handleConnectClick(profile.id)}
            connectionModeSourceId={connectionModeSourceId}
            onConnectionTargetClick={handleConnectionTargetClick}
            zoom={zoom}
            panOffset={panOffset}
          />
        ))}
      </div>
      <button
        className="add-button"
        onClick={handleAddProfile}
        title="Add Profile"
        style={{ bottom: 24 + TREE_TABS_BAR_HEIGHT }}
      >
        +
      </button>
      <TreeTabsBar
        trees={trees}
        selectedTreeId={selectedTreeId}
        onSelectTree={setSelectedTreeId}
        onAddTree={() => setShowAddTreeModal(true)}
      />
      {showAddTreeModal && (
        <AddTreeModal
          onClose={() => setShowAddTreeModal(false)}
          onSubmit={handleAddTreeSubmit}
        />
      )}
      {editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          onSave={handleSaveEdit}
          onClose={() => setEditingProfileId(null)}
          onDelete={(id) => {
            handleDeleteProfile(id)
            setEditingProfileId(null)
          }}
        />
      )}
      {pendingTargetId && (
        <RelationshipInputModal
          initialText={editingConnection?.relationshipText || ''}
          onSave={handleSaveConnection}
          onCancel={handleCancelConnection}
          onDelete={editingConnectionId ? () => handleDeleteConnection(editingConnectionId) : undefined}
          isEditing={!!editingConnectionId}
        />
      )}
    </div>
  )
}

export default FreeBoard
