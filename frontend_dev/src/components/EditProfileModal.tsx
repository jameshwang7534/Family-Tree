import { useState, useEffect, useRef } from 'react'
import type { Profile } from '../types'
import '../styles/EditProfileModal.css'

function ageFromBirthDate(birthDateStr: string): number {
  const s = birthDateStr.trim()
  if (!s) return 0
  // Parse YYYY-MM-DD as local date (new Date(s) would parse as UTC and cause timezone off-by-one)
  const parts = s.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0
  const [y, m, d] = parts
  if (m < 1 || m > 12 || d < 1) return 0
  const birth = new Date(y, m - 1, d)
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age > 0 ? age : 0
}

function parseBirthDateToParts(birthDateStr: string): { month: number | ''; day: number | ''; year: number | '' } {
  const s = birthDateStr.trim()
  if (!s) return { month: '', day: '', year: '' }
  const parts = s.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return { month: '', day: '', year: '' }
  const [y, m, d] = parts
  if (m < 1 || m > 12 || d < 1) return { month: '', day: '', year: '' }
  return { month: m, day: d, year: y }
}

function getDaysInMonth(month: number, year: number): number {
  if (month < 1 || month > 12) return 31
  return new Date(year || new Date().getFullYear(), month, 0).getDate()
}

function partsToBirthDateString(month: number | '', day: number | '', year: number | ''): string {
  if (month === '' || day === '' || year === '') return ''
  const m = Number(month)
  const d = Number(day)
  const y = Number(year)
  if (m < 1 || m > 12 || d < 1 || y < 1000) return ''
  const maxDay = getDaysInMonth(m, y)
  if (d > maxDay) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}`
}

interface EditProfileModalProps {
  profile: Profile
  onSave: (updates: Partial<Profile>) => void
  onClose: () => void
  onDelete?: (id: string) => void
}

function EditProfileModal({ profile, onSave, onClose, onDelete }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name)
  const [month, setMonth] = useState<number | ''>(() => parseBirthDateToParts(profile.birthDate).month)
  const [day, setDay] = useState<number | ''>(() => parseBirthDateToParts(profile.birthDate).day)
  const [year, setYear] = useState<number | ''>(() => parseBirthDateToParts(profile.birthDate).year)
  const [photo, setPhoto] = useState(profile.photo ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const birthDateStr = partsToBirthDateString(month, day, year)
  const calculatedAge = ageFromBirthDate(birthDateStr)

  const maxDay = (typeof month === 'number' && typeof year === 'number')
    ? getDaysInMonth(month, year)
    : 31

  // Clamp day when month/year changes (e.g. 31 → 28 for February)
  useEffect(() => {
    if (typeof day === 'number' && day > maxDay) setDay(maxDay)
  }, [maxDay])

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === '') {
      setMonth('')
      return
    }
    const n = parseInt(v, 10)
    if (Number.isNaN(n)) return
    if (n < 1) setMonth(1)
    else if (n > 12) setMonth(12)
    else setMonth(n)
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === '') {
      setDay('')
      return
    }
    const n = parseInt(v, 10)
    if (Number.isNaN(n)) return
    if (n < 1) setDay(1)
    else if (n > maxDay) setDay(maxDay)
    else setDay(n)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === '') {
      setYear('')
      return
    }
    const n = parseInt(v, 10)
    if (Number.isNaN(n)) return
    setYear(n)
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPhoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      age: calculatedAge,
      birthDate: birthDateStr,
      photo: photo || undefined,
    })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleDelete = () => {
    if (onDelete && window.confirm('Delete this profile? This cannot be undone.')) {
      onDelete(profile.id)
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <h2>Edit Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Birth date:</label>
            <div className="form-birthdate-row">
              <div className="form-birthdate-field">
                <label htmlFor="birthMonth" className="form-birthdate-sublabel">Month</label>
                <input
                  id="birthMonth"
                  type="number"
                  min={1}
                  max={12}
                  value={month === '' ? '' : month}
                  onChange={handleMonthChange}
                  onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }}
                  placeholder="1-12"
                  inputMode="numeric"
                  className="form-birthdate-input"
                />
              </div>
              <div className="form-birthdate-field">
                <label htmlFor="birthDay" className="form-birthdate-sublabel">Day</label>
                <input
                  id="birthDay"
                  type="number"
                  min={1}
                  max={maxDay}
                  value={day === '' ? '' : day}
                  onChange={handleDayChange}
                  onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }}
                  placeholder={`1-${maxDay}`}
                  inputMode="numeric"
                  className="form-birthdate-input"
                />
              </div>
              <div className="form-birthdate-field">
                <label htmlFor="birthYear" className="form-birthdate-sublabel">Year</label>
                <input
                  id="birthYear"
                  type="number"
                  value={year === '' ? '' : year}
                  onChange={handleYearChange}
                  onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }}
                  placeholder="Year"
                  inputMode="numeric"
                  className="form-birthdate-input"
                />
              </div>
            </div>
            {calculatedAge > 0 && (
              <p className="form-age-hint">Age: {calculatedAge} years</p>
            )}
            {calculatedAge === 0 && (month !== '' || day !== '' || year !== '') && (
              <p className="form-age-hint form-age-invalid">Unable to calculate age</p>
            )}
          </div>
          <div className="form-group">
            <label>Profile picture:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="form-file"
            />
            {photo && (
              <div className="form-photo-preview">
                <img src={photo} alt="Preview" />
                <button
                  type="button"
                  className="form-photo-remove"
                  onClick={() => { setPhoto(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
          {onDelete && (
            <div className="modal-delete-section">
              <button type="button" className="modal-delete-btn" onClick={handleDelete}>
                Delete profile
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default EditProfileModal
