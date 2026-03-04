export interface Profile {
  id: string
  name: string
  relationship: string
  age: number
  gender: string
  birthDate: string
  story: string
  photo?: string
  video?: string
  voices?: string[]
  x: number
  y: number
}

export interface Tree {
  id: string
  userId: string
  name: string
  description: string | null
  iconUrl: string
  createdAt: string
  updatedAt: string
}

export interface Connection {
  id: string
  fromCardId: string
  toCardId: string
  relationshipText: string
}

export interface ProfileMediaItem {
  id: string
  treeId: string
  profileId: string
  fileUrl: string
  fileType: 'image' | 'video'
  caption: string | null
  createdAt: string
}

export interface ProfileVoiceItem {
  id: string
  treeId: string
  profileId: string
  fileUrl: string
  durationSeconds: number | null
  createdAt: string
}

export interface ProfileStoryItem {
  id: string
  treeId: string
  profileId: string
  title: string
  dateCreated: string
  mainText: string
  createdAt: string
  updatedAt: string
}
