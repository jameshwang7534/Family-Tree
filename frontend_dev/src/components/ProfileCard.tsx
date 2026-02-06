import { useState, useRef, useEffect } from 'react'
import type { Profile } from '../types'
import '../styles/ProfileCard.css'

interface ProfileCardProps {
  profile: Profile
  onUpdate: (id: string, updates: Partial<Profile>) => void
  onDelete: (id: string) => void
  onEditClick: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

function ProfileCard({ profile, onUpdate, onDelete, onEditClick, onDragStart, onDragEnd }: ProfileCardProps) {
  const [isDragging, setIsDragging] = useState(false)
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
          <div className="profile-card-avatar">
            {profile.photo ? (
              <img src={profile.photo} alt={profile.name || 'Profile'} />
            ) : (
              <div className="profile-card-avatar-default" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
          <h3>{profile.name || 'New Profile'}</h3>
        </div>
        <div className="profile-card-body">
          {(profile.age > 0 || profile.birthDate) && (
            <p className="profile-meta">
              {profile.age > 0 && <span>Age {profile.age}</span>}
              {profile.age > 0 && profile.birthDate && ' · '}
              {profile.birthDate && <span>{profile.birthDate}</span>}
            </p>
          )}
          {profile.relationship && (
            <p className="relationship">{profile.relationship}</p>
          )}
        </div>
        <div className="profile-card-actions">
          <button type="button" onClick={onEditClick}>Edit Profile</button>
        </div>
      </div>
    </>
  )
}

export default ProfileCard
