import { useState, useRef, useEffect } from 'react'
import ProfileCard from './ProfileCard'
import EditProfileModal from './EditProfileModal'
import { TreeTabsBar, TREE_TABS_BAR_HEIGHT } from './TreeTabsBar'
import { AddTreeModal } from './AddTreeModal'
import { useTree } from '../context/TreeContext'
import { treeService } from '../services/treeService'
import type { Profile } from '../types'
import '../styles/FreeBoard.css'

const PROFILES_STORAGE_PREFIX = 'family-tree-profiles-'
const NEXT_ID_STORAGE_PREFIX = 'family-tree-next-id-'

function getProfilesKey(treeId: string) {
  return `${PROFILES_STORAGE_PREFIX}${treeId}`
}

function getNextIdKey(treeId: string) {
  return `${NEXT_ID_STORAGE_PREFIX}${treeId}`
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
  const canvasRef = useRef<HTMLDivElement>(null)
  const isCardDraggingRef = useRef(false)
  const skipNextPersistRef = useRef(false)

  // Load this tree's board when selected tree changes
  useEffect(() => {
    if (!selectedTreeId) return
    setProfiles(loadProfilesForTree(selectedTreeId))
    setNextId(loadNextIdForTree(selectedTreeId))
    setEditingProfileId(null)
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
      target.closest('.tree-tabs-bar')
    ) {
      return
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

  return (
    <div className="free-board free-board-with-tabs">
      <div
        ref={canvasRef}
        className={`board-canvas ${isPanning ? 'panning' : ''}`}
        onPointerDown={handlePointerDown}
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
        {profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onUpdate={handleUpdateProfile}
            onDelete={handleDeleteProfile}
            onEditClick={() => setEditingProfileId(profile.id)}
            onDragStart={handleCardDragStart}
            onDragEnd={handleCardDragEnd}
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
    </div>
  )
}

export default FreeBoard
