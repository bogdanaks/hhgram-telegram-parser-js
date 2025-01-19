export interface CreateTgUser {
  id: string
  premium?: boolean
  first_name?: string
  last_name?: string
  username?: string
  phone?: string
  photo_id?: string | null
}
