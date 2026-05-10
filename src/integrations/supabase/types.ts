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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_key_usage: {
        Row: {
          access_key_id: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_key_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_key_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_key_usage_access_key_id_fkey"
            columns: ["access_key_id"]
            isOneToOne: false
            referencedRelation: "access_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      access_keys: {
        Row: {
          active: boolean | null
          assigned_role: string | null
          created_at: string
          expires_at: string | null
          id: string
          key_value: string
          max_uses: number | null
          team_id: string | null
          user_id: string
          uses: number | null
        }
        Insert: {
          active?: boolean | null
          assigned_role?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_value: string
          max_uses?: number | null
          team_id?: string | null
          user_id: string
          uses?: number | null
        }
        Update: {
          active?: boolean | null
          assigned_role?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_value?: string
          max_uses?: number | null
          team_id?: string | null
          user_id?: string
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "access_keys_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      lead_history: {
        Row: {
          action: string
          created_at: string
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_score: number | null
          amount: number | null
          comment: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          image_url: string | null
          manager_id: string | null
          name: string
          offer: string | null
          offer_category: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          team_id: string | null
          telegram: string | null
          updated_at: string
        }
        Insert: {
          ai_score?: number | null
          amount?: number | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          manager_id?: string | null
          name: string
          offer?: string | null
          offer_category?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          team_id?: string | null
          telegram?: string | null
          updated_at?: string
        }
        Update: {
          ai_score?: number | null
          amount?: number | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          manager_id?: string | null
          name?: string
          offer?: string | null
          offer_category?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          team_id?: string | null
          telegram?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category: Database["public"]["Enums"]["offer_category"]
          created_at: string
          geo: string | null
          id: string
          name: string
          notes: string | null
          payout: number | null
          payout_max: number | null
          payout_min: number | null
          priority: number | null
          rate: string | null
          stage: string | null
          status: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["offer_category"]
          created_at?: string
          geo?: string | null
          id?: string
          name: string
          notes?: string | null
          payout?: number | null
          payout_max?: number | null
          payout_min?: number | null
          priority?: number | null
          rate?: string | null
          stage?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["offer_category"]
          created_at?: string
          geo?: string | null
          id?: string
          name?: string
          notes?: string | null
          payout?: number | null
          payout_max?: number | null
          payout_min?: number | null
          priority?: number | null
          rate?: string | null
          stage?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_blocked: boolean | null
          name: string
          phone: string | null
          status: string | null
          team: string | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          name?: string
          phone?: string | null
          status?: string | null
          team?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          name?: string
          phone?: string | null
          status?: string | null
          team?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          team_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          team_role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          team_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_offers: {
        Row: {
          created_at: string
          custom_payout: number | null
          enabled: boolean | null
          id: string
          offer_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          custom_payout?: number | null
          enabled?: boolean | null
          id?: string
          offer_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          custom_payout?: number | null
          enabled?: boolean | null
          id?: string
          offer_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_offers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          slug: string
          status: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          slug: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          slug?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_team: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_owner_team: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_lead: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "teamlead"
        | "user"
        | "team_lead"
        | "owner_team"
      lead_status: "NEW" | "IN_PROGRESS" | "SUCCESS" | "REJECTED"
      offer_category: "RKO" | "CREDIT" | "DEBIT" | "REGBIZ" | "MFO" | "HR"
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
      app_role: [
        "super_admin",
        "admin",
        "teamlead",
        "user",
        "team_lead",
        "owner_team",
      ],
      lead_status: ["NEW", "IN_PROGRESS", "SUCCESS", "REJECTED"],
      offer_category: ["RKO", "CREDIT", "DEBIT", "REGBIZ", "MFO", "HR"],
    },
  },
} as const
