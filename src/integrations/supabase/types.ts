export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      api_files: {
        Row: {
          api_user_id: string
          content_type: string | null
          created_at: string
          expires_at: string | null
          file_path: string
          file_size_bytes: number | null
          filename: string
          id: string
          is_temporary: boolean | null
          job_id: string | null
        }
        Insert: {
          api_user_id: string
          content_type?: string | null
          created_at?: string
          expires_at?: string | null
          file_path: string
          file_size_bytes?: number | null
          filename: string
          id?: string
          is_temporary?: boolean | null
          job_id?: string | null
        }
        Update: {
          api_user_id?: string
          content_type?: string | null
          created_at?: string
          expires_at?: string | null
          file_path?: string
          file_size_bytes?: number | null
          filename?: string
          id?: string
          is_temporary?: boolean | null
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_files_api_user_id_fkey"
            columns: ["api_user_id"]
            isOneToOne: false
            referencedRelation: "api_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "api_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      api_jobs: {
        Row: {
          api_user_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_data: Json | null
          job_type: string
          progress_percent: number | null
          result_data: Json | null
          started_at: string | null
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_user_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type: string
          progress_percent?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_user_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          job_type?: string
          progress_percent?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_jobs_api_user_id_fkey"
            columns: ["api_user_id"]
            isOneToOne: false
            referencedRelation: "api_users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_user_id: string
          created_at: string
          date_hour: string
          endpoint: string
          id: string
          method: string
          processing_time_ms: number | null
          request_count: number
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_status: number | null
        }
        Insert: {
          api_user_id: string
          created_at?: string
          date_hour?: string
          endpoint: string
          id?: string
          method: string
          processing_time_ms?: number | null
          request_count?: number
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_status?: number | null
        }
        Update: {
          api_user_id?: string
          created_at?: string
          date_hour?: string
          endpoint?: string
          id?: string
          method?: string
          processing_time_ms?: number | null
          request_count?: number
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_user_id_fkey"
            columns: ["api_user_id"]
            isOneToOne: false
            referencedRelation: "api_users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_users: {
        Row: {
          api_key: string
          api_key_hash: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          rate_limit_requests: number
          rate_limit_window: number
          tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          api_key: string
          api_key_hash: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          rate_limit_requests?: number
          rate_limit_window?: number
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          api_key?: string
          api_key_hash?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          rate_limit_requests?: number
          rate_limit_window?: number
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      approved_users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      artist_cache: {
        Row: {
          artist_name: string
          created_at: string
          expires_at: string | null
          id: string
          musicbrainz_id: string | null
          updated_at: string
          video_data: Json | null
        }
        Insert: {
          artist_name: string
          created_at?: string
          expires_at?: string | null
          id?: string
          musicbrainz_id?: string | null
          updated_at?: string
          video_data?: Json | null
        }
        Update: {
          artist_name?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          musicbrainz_id?: string | null
          updated_at?: string
          video_data?: Json | null
        }
        Relationships: []
      }
      music_videos: {
        Row: {
          artist_name: string
          created_at: string
          id: string
          music_video_url: string
          musicbrainz_artist_id: string | null
          track_id: string
          track_name: string
          track_thumb: string | null
          updated_at: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          id?: string
          music_video_url: string
          musicbrainz_artist_id?: string | null
          track_id: string
          track_name: string
          track_thumb?: string | null
          updated_at?: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          id?: string
          music_video_url?: string
          musicbrainz_artist_id?: string | null
          track_id?: string
          track_name?: string
          track_thumb?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      node_configurations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean | null
          node_type: Database["public"]["Enums"]["node_type"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          node_type: Database["public"]["Enums"]["node_type"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          node_type?: Database["public"]["Enums"]["node_type"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_configurations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
          updated_at: string
          youtube_playlist_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
          youtube_playlist_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
          youtube_playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          display_name: string
          id: string
          status: Database["public"]["Enums"]["tenant_status"]
          subdomain: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { _api_key: string; _endpoint: string }
        Returns: boolean
      }
      get_user_tenant: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_approved: {
        Args: { _email: string }
        Returns: boolean
      }
      log_api_usage: {
        Args: {
          _api_key: string
          _endpoint: string
          _method: string
          _processing_time_ms?: number
          _request_size_bytes?: number
          _response_size_bytes?: number
          _status?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      node_type:
        | "admin"
        | "user"
        | "kiosk"
        | "player"
        | "hardware_manager"
        | "lan_mdns"
      tenant_status: "active" | "inactive" | "suspended"
      user_role: "super_admin" | "tenant_admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      node_type: [
        "admin",
        "user",
        "kiosk",
        "player",
        "hardware_manager",
        "lan_mdns",
      ],
      tenant_status: ["active", "inactive", "suspended"],
      user_role: ["super_admin", "tenant_admin", "user"],
    },
  },
} as const
