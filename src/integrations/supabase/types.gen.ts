export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      playlists: {
        Row: {
          id: string
          user_id: string
          video_id: string
          title: string
          artist: string
          position: number
          created_at: string
          room_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          title: string
          artist: string
          position: number
          created_at?: string
          room_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          title?: string
          artist?: string
          position?: number
          created_at?: string
          room_id?: string | null
        }
      }
      approved_devices: {
        Row: {
          id: string
          device_id: string
          user_id: string
          approved_at: string
          device_name: string | null
        }
        Insert: {
          id?: string
          device_id: string
          user_id: string
          approved_at?: string
          device_name?: string | null
        }
        Update: {
          id?: string
          device_id?: string
          user_id?: string
          approved_at?: string
          device_name?: string | null
        }
      }
      rooms: {
        Row: {
          id: string
          owner_id: string
          name: string
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          is_public?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
