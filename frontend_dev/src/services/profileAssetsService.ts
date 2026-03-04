import type { ProfileMediaItem, ProfileVoiceItem, ProfileStoryItem } from '../types'

// Use same base as treeService: must include /api so paths like /api/trees/... work
const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('authToken')
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function getErrorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string | { msg?: string }[] }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg
  } catch {
    /* ignore */
  }
  return res.status === 401 ? 'Unauthorized' : res.status === 404 ? 'Not found' : `Request failed (${res.status})`
}

function mediaUrl(treeId: string, profileId: string): string {
  return `${API_BASE}/profile-assets/trees/${treeId}/profiles/${encodeURIComponent(profileId)}/media`
}

function voiceUrl(treeId: string, profileId: string): string {
  return `${API_BASE}/profile-assets/trees/${treeId}/profiles/${encodeURIComponent(profileId)}/voice`
}

function storiesUrl(treeId: string, profileId: string): string {
  return `${API_BASE}/profile-assets/trees/${treeId}/profiles/${encodeURIComponent(profileId)}/stories`
}

export const profileAssetsService = {
  // --- Media ---
  listMedia: async (treeId: string, profileId: string): Promise<ProfileMediaItem[]> => {
    const res = await fetch(mediaUrl(treeId, profileId), { headers: getAuthHeader() })
    if (!res.ok) {
      const detail = await getErrorDetail(res)
      throw new Error(detail)
    }
    return res.json()
  },

  uploadMedia: async (
    treeId: string,
    profileId: string,
    file: File,
    caption?: string | null
  ): Promise<ProfileMediaItem> => {
    const form = new FormData()
    form.append('file', file)
    if (caption != null && caption.trim()) form.append('caption', caption.trim())
    const res = await fetch(mediaUrl(treeId, profileId), {
      method: 'POST',
      headers: getAuthHeader(),
      body: form,
    })
    if (!res.ok) {
      const detail = await getErrorDetail(res)
      throw new Error(detail)
    }
    return res.json()
  },

  deleteMedia: async (treeId: string, profileId: string, mediaId: string): Promise<void> => {
    const res = await fetch(`${mediaUrl(treeId, profileId)}/${mediaId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      const detail = await getErrorDetail(res)
      throw new Error(detail)
    }
  },

  // --- Voice ---
  listVoice: async (treeId: string, profileId: string): Promise<ProfileVoiceItem[]> => {
    const res = await fetch(voiceUrl(treeId, profileId), { headers: getAuthHeader() })
    if (!res.ok) {
      const detail = await getErrorDetail(res)
      throw new Error(detail)
    }
    return res.json()
  },

  uploadVoice: async (treeId: string, profileId: string, file: File): Promise<ProfileVoiceItem> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(voiceUrl(treeId, profileId), {
      method: 'POST',
      headers: getAuthHeader(),
      body: form,
    })
    if (!res.ok) {
      const detail = await getErrorDetail(res)
      throw new Error(detail)
    }
    return res.json()
  },

  deleteVoice: async (treeId: string, profileId: string, voiceId: string): Promise<void> => {
    const res = await fetch(`${voiceUrl(treeId, profileId)}/${voiceId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized')
      throw new Error('Failed to delete voice')
    }
  },

  // --- Stories ---
  listStories: async (treeId: string, profileId: string): Promise<ProfileStoryItem[]> => {
    const res = await fetch(storiesUrl(treeId, profileId), { headers: getAuthHeader() })
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized')
      throw new Error('Failed to load stories')
    }
    return res.json()
  },

  createStory: async (
    treeId: string,
    profileId: string,
    payload: { title: string; mainText: string; dateCreated?: string | null }
  ): Promise<ProfileStoryItem> => {
    const res = await fetch(storiesUrl(treeId, profileId), {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.title,
        mainText: payload.mainText,
        dateCreated: payload.dateCreated || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string }
      throw new Error(err.detail || 'Failed to create story')
    }
    return res.json()
  },

  updateStory: async (
    treeId: string,
    profileId: string,
    storyId: string,
    payload: { title?: string; mainText?: string; dateCreated?: string | null }
  ): Promise<ProfileStoryItem> => {
    const res = await fetch(`${storiesUrl(treeId, profileId)}/${storyId}`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.title,
        mainText: payload.mainText,
        dateCreated: payload.dateCreated ?? undefined,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string }
      throw new Error(err.detail || 'Failed to update story')
    }
    return res.json()
  },

  deleteStory: async (treeId: string, profileId: string, storyId: string): Promise<void> => {
    const res = await fetch(`${storiesUrl(treeId, profileId)}/${storyId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized')
      throw new Error('Failed to delete story')
    }
  },

  /** Delete all media, voice, and stories for a profile (call when profile card is deleted). */
  deleteProfileAssets: async (treeId: string, profileId: string): Promise<void> => {
    const url = `${API_BASE}/profile-assets/trees/${treeId}/profiles/${encodeURIComponent(profileId)}`
    const res = await fetch(url, { method: 'DELETE', headers: getAuthHeader() })
    if (!res.ok) {
      const detail = await getErrorDetail(res)
      throw new Error(detail)
    }
  },
}
