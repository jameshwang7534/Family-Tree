import { useState, useRef, useEffect } from 'react'
import type { Profile } from '../types'
import EditProfileModal from './EditProfileModal'
import '../styles/ProfileCard.css'

interface ProfileCardProps {
  profile: Profile
  onUpdate: (id: string, updates: Partial<Profile>) => void
  onDelete: (id: string) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

function ProfileCard({ profile, onUpdate, onDelete, onDragStart, onDragEnd }: ProfileCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't drag if clicking on the button
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    if (cardRef.current) {
      e.stopPropagation() // Prevent canvas panning
      const rect = cardRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
      onDragStart?.()
      cardRef.current.setPointerCapture(e.pointerId)
      e.preventDefault()
    }
  }

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging && cardRef.current) {
        const boardCanvas = cardRef.current.closest('.board-canvas')
        if (boardCanvas) {
          // Get canvas position accounting for transform
          const boardRect = boardCanvas.getBoundingClientRect()
          // Calculate position relative to canvas (cards are positioned absolutely within canvas)
          const newX = e.clientX - boardRect.left - dragOffset.x
          const newY = e.clientY - boardRect.top - dragOffset.y
          
          // Constrain to reasonable bounds (relaxed for panning)
          const cardWidth = cardRef.current.offsetWidth
          const cardHeight = cardRef.current.offsetHeight
          const constrainedX = Math.max(-2000, Math.min(newX, boardRect.width + 2000 - cardWidth))
          const constrainedY = Math.max(-2000, Math.min(newY, boardRect.height + 2000 - cardHeight))
          
          onUpdate(profile.id, { x: constrainedX, y: constrainedY })
        }
        e.preventDefault()
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (isDragging && cardRef.current) {
        setIsDragging(false)
        onDragEnd?.()
        cardRef.current.releasePointerCapture(e.pointerId)
      }
    }

    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.body.style.userSelect = ''
    }
  }, [isDragging, dragOffset, profile.id, onUpdate, onDragEnd])

  const handleSave = (name: string, relationship: string) => {
    onUpdate(profile.id, { name, relationship })
    setIsEditing(false)
  }

  return (
    <>
      <div
        ref={cardRef}
        className={`profile-card ${isDragging ? 'dragging' : ''}`}
        style={{
          left: `${profile.x}px`,
          top: `${profile.y}px`,
        }}
        onPointerDown={handlePointerDown}
      >
        <div className="profile-card-header">
          <h3>{profile.name || 'New Profile'}</h3>
        </div>
        <div className="profile-card-body">
          {profile.relationship && (
            <p className="relationship">{profile.relationship}</p>
          )}
        </div>
        <div className="profile-card-actions">
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>
      </div>
      {isEditing && (
        <EditProfileModal
          profile={profile}
          onSave={handleSave}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  )
}

export default ProfileCard
