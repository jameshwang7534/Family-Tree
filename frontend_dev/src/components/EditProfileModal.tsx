import { useState, useEffect, useRef, useCallback } from 'react'
import type { Profile, ProfileMediaItem, ProfileVoiceItem, ProfileStoryItem } from '../types'
import { profileAssetsService } from '../services/profileAssetsService'
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
  treeId: string | null
  onSave: (updates: Partial<Profile>) => void
  onClose: () => void
  onDelete?: (id: string) => void
}

function EditProfileModal({ profile, treeId, onSave, onClose, onDelete }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name)
  const [month, setMonth] = useState<number | ''>(() => parseBirthDateToParts(profile.birthDate).month)
  const [day, setDay] = useState<number | ''>(() => parseBirthDateToParts(profile.birthDate).day)
  const [year, setYear] = useState<number | ''>(() => parseBirthDateToParts(profile.birthDate).year)
  const [photo, setPhoto] = useState(profile.photo ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile assets (media, voice, stories) — only when treeId is set
  const [mediaList, setMediaList] = useState<ProfileMediaItem[]>([])
  const [voiceList, setVoiceList] = useState<ProfileVoiceItem[]>([])
  const [storiesList, setStoriesList] = useState<ProfileStoryItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [storyForm, setStoryForm] = useState({ title: '', mainText: '', dateCreated: '' })
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const voiceInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)

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
        if (editingStoryId) setEditingStoryId(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, editingStoryId])

  const loadMedia = useCallback(async () => {
    if (!treeId) return
    setMediaLoading(true)
    setMediaError(null)
    try {
      const list = await profileAssetsService.listMedia(treeId, profile.id)
      setMediaList(list)
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : 'Failed to load media')
    } finally {
      setMediaLoading(false)
    }
  }, [treeId, profile.id])

  const loadVoice = useCallback(async () => {
    if (!treeId) return
    setVoiceLoading(true)
    setVoiceError(null)
    try {
      const list = await profileAssetsService.listVoice(treeId, profile.id)
      setVoiceList(list)
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'Failed to load voice')
    } finally {
      setVoiceLoading(false)
    }
  }, [treeId, profile.id])

  const loadStories = useCallback(async () => {
    if (!treeId) return
    setStoriesLoading(true)
    setStoriesError(null)
    try {
      const list = await profileAssetsService.listStories(treeId, profile.id)
      setStoriesList(list)
    } catch (e) {
      setStoriesError(e instanceof Error ? e.message : 'Failed to load stories')
    } finally {
      setStoriesLoading(false)
    }
  }, [treeId, profile.id])

  useEffect(() => {
    if (!treeId) return
    loadMedia()
    loadVoice()
    loadStories()
  }, [treeId, loadMedia, loadVoice, loadStories])

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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!treeId || !files?.length) return
    setUploadingMedia(true)
    setMediaError(null)
    try {
      for (let i = 0; i < files.length; i++) {
        await profileAssetsService.uploadMedia(treeId, profile.id, files[i])
      }
      await loadMedia()
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingMedia(false)
      e.target.value = ''
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!treeId || !window.confirm('Remove this photo/video?')) return
    try {
      await profileAssetsService.deleteMedia(treeId, profile.id, mediaId)
      await loadMedia()
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!treeId || !file) return
    setUploadingVoice(true)
    setVoiceError(null)
    try {
      await profileAssetsService.uploadVoice(treeId, profile.id, file)
      await loadVoice()
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingVoice(false)
      e.target.value = ''
    }
  }

  const handleDeleteVoice = async (voiceId: string) => {
    if (!treeId || !window.confirm('Remove this recording?')) return
    try {
      await profileAssetsService.deleteVoice(treeId, profile.id, voiceId)
      await loadVoice()
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Recording not supported in this browser')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        setIsRecording(false)
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' })
        if (!treeId) return
        setUploadingVoice(true)
        setVoiceError(null)
        try {
          await profileAssetsService.uploadVoice(treeId, profile.id, file)
          await loadVoice()
        } catch (err) {
          setVoiceError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
          setUploadingVoice(false)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
      recorderRef.current = null
    }
  }

  const openNewStory = () => {
    setEditingStoryId('new')
    setStoryForm({
      title: '',
      mainText: '',
      dateCreated: new Date().toISOString().slice(0, 10),
    })
  }

  const openEditStory = (s: ProfileStoryItem) => {
    setEditingStoryId(s.id)
    setStoryForm({
      title: s.title,
      mainText: s.mainText,
      dateCreated: s.dateCreated.slice(0, 10),
    })
  }

  const saveStory = async () => {
    if (!treeId) return
    const title = storyForm.title.trim()
    const mainText = storyForm.mainText.trim()
    if (!title) {
      setStoriesError('Title is required')
      return
    }
    if (!mainText) {
      setStoriesError('Main text is required')
      return
    }
    setStoriesError(null)
    try {
      if (editingStoryId === 'new') {
        await profileAssetsService.createStory(treeId, profile.id, {
          title,
          mainText,
          dateCreated: storyForm.dateCreated || undefined,
        })
      } else {
        await profileAssetsService.updateStory(treeId, profile.id, editingStoryId, {
          title,
          mainText,
          dateCreated: storyForm.dateCreated || undefined,
        })
      }
      setEditingStoryId(null)
      await loadStories()
    } catch (err) {
      setStoriesError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const handleDeleteStory = async (storyId: string) => {
    if (!treeId || !window.confirm('Delete this story?')) return
    try {
      await profileAssetsService.deleteStory(treeId, profile.id, storyId)
      await loadStories()
    } catch (err) {
      setStoriesError(err instanceof Error ? err.message : 'Delete failed')
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

          {treeId && (
            <>
              <div className="form-group profile-assets-section">
                <label>Photos &amp; videos</label>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                  disabled={uploadingMedia}
                  className="form-file"
                />
                {uploadingMedia && <p className="form-asset-status">Uploading…</p>}
                {mediaError && <p className="form-asset-error">{mediaError}</p>}
                {mediaLoading ? (
                  <p className="form-asset-status">Loading…</p>
                ) : (
                  <div className="profile-media-gallery">
                    {mediaList.map((m) => (
                      <div key={m.id} className="profile-media-thumb">
                        {m.fileType === 'image' ? (
                          <img src={m.fileUrl} alt={m.caption || 'Media'} />
                        ) : (
                          <video src={m.fileUrl} muted />
                        )}
                        <button type="button" className="profile-media-remove" onClick={() => handleDeleteMedia(m.id)} title="Remove">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group profile-assets-section">
                <label>Voice / audio</label>
                <div className="profile-voice-actions">
                  <button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={uploadingVoice} className="profile-voice-record">
                    {isRecording ? 'Stop recording' : 'Record'}
                  </button>
                  <input
                    ref={voiceInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleVoiceUpload}
                    disabled={uploadingVoice}
                    className="form-file profile-voice-upload"
                  />
                </div>
                {uploadingVoice && <p className="form-asset-status">Uploading…</p>}
                {voiceError && <p className="form-asset-error">{voiceError}</p>}
                {voiceLoading ? (
                  <p className="form-asset-status">Loading…</p>
                ) : (
                  <ul className="profile-voice-list">
                    {voiceList.map((v) => (
                      <li key={v.id} className="profile-voice-item">
                        <audio src={v.fileUrl} controls />
                        <button type="button" className="profile-media-remove" onClick={() => handleDeleteVoice(v.id)} title="Remove">×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group profile-assets-section">
                <label>Stories</label>
                {storiesError && <p className="form-asset-error">{storiesError}</p>}
                {editingStoryId ? (
                  <div className="profile-story-form">
                    <div className="form-group">
                      <input
                        value={storyForm.title}
                        onChange={(e) => setStoryForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Title (required)"
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="date"
                        value={storyForm.dateCreated}
                        onChange={(e) => setStoryForm((f) => ({ ...f, dateCreated: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <textarea
                        value={storyForm.mainText}
                        onChange={(e) => setStoryForm((f) => ({ ...f, mainText: e.target.value }))}
                        placeholder="Main text (required)"
                        rows={4}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4 }}
                      />
                    </div>
                    <div className="profile-story-form-actions">
                      <button type="button" onClick={() => setEditingStoryId(null)}>Cancel</button>
                      <button type="button" onClick={saveStory}>Save story</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={openNewStory} className="profile-story-add">Add story</button>
                    {storiesLoading ? (
                      <p className="form-asset-status">Loading…</p>
                    ) : (
                      <ul className="profile-stories-list">
                        {storiesList.map((s) => (
                          <li key={s.id} className="profile-story-item">
                            <div className="profile-story-item-head">
                              <strong>{s.title}</strong>
                              <span className="profile-story-date">{s.dateCreated}</span>
                            </div>
                            <p className="profile-story-preview">{s.mainText.slice(0, 80)}{s.mainText.length > 80 ? '…' : ''}</p>
                            <div className="profile-story-item-actions">
                              <button type="button" onClick={() => openEditStory(s)}>Edit</button>
                              <button type="button" onClick={() => handleDeleteStory(s.id)}>Delete</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </>
          )}

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
