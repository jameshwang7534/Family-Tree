import { useState, useEffect, useRef } from 'react'
import '../styles/RelationshipInputModal.css'

interface RelationshipInputModalProps {
  initialText?: string
  onSave: (text: string) => void
  onCancel: () => void
  onDelete?: () => void
  isEditing?: boolean
}

function RelationshipInputModal({ initialText = '', onSave, onCancel, onDelete, isEditing = false }: RelationshipInputModalProps) {
  const [text, setText] = useState(initialText)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSave(text.trim())
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const handleDelete = () => {
    if (onDelete && window.confirm('Delete this connection?')) {
      onDelete()
    }
  }

  return (
    <div className="relationship-modal-overlay" onClick={handleOverlayClick}>
      <div className="relationship-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{isEditing ? 'Edit Relationship' : 'Enter Relationship'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="relationship-text">Relationship:</label>
            <input
              id="relationship-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Father, Mother, Sibling, Spouse"
              ref={inputRef}
            />
          </div>
          <div className="relationship-modal-actions">
            {isEditing && onDelete && (
              <button type="button" onClick={handleDelete} className="relationship-delete-btn">
                Delete
              </button>
            )}
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" disabled={!text.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RelationshipInputModal
