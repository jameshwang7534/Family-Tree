import { useState, useRef, useEffect } from 'react'
import ProfileCard from './ProfileCard'
import EditProfileModal from './EditProfileModal'
import type { Profile } from '../types'
import '../styles/FreeBoard.css'

const PROFILES_STORAGE_KEY = 'family-tree-profiles'
const NEXT_ID_STORAGE_KEY = 'family-tree-next-id'

function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Profile[]
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {
    // ignore
  }
  return []
}

function loadNextId(): number {
  try {
    const raw = localStorage.getItem(NEXT_ID_STORAGE_KEY)
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
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles)
  const [nextId, setNextId] = useState(loadNextId)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const isCardDraggingRef = useRef(false)

  useEffect(() => {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles))
  }, [profiles])

  useEffect(() => {
    localStorage.setItem(NEXT_ID_STORAGE_KEY, String(nextId))
  }, [nextId])

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
    // Don't pan if clicking on a card or button
    const target = e.target as HTMLElement
    if (target.closest('.profile-card') || target.closest('.add-button')) {
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

  return (
    <div className="free-board">
      <div
        ref={canvasRef}
        className={`board-canvas ${isPanning ? 'panning' : ''}`}
        onPointerDown={handlePointerDown}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
        }}
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
      <button className="add-button" onClick={handleAddProfile} title="Add Profile">
        +
      </button>
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
