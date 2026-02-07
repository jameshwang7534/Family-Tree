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
