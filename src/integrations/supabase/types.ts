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
      assessment_items: {
        Row: {
          assessment_id: string
          evidence: string
          id: string
          organization_id: string
          ref: string
          requirement: string
          response: string
          section: string
          sort: number
        }
        Insert: {
          assessment_id: string
          evidence?: string
          id?: string
          organization_id: string
          ref: string
          requirement: string
          response?: string
          section?: string
          sort?: number
        }
        Update: {
          assessment_id?: string
          evidence?: string
          id?: string
          organization_id?: string
          ref?: string
          requirement?: string
          response?: string
          section?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_items_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          audit_type: string
          auditor: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          release_roles: string[]
          released: boolean
          released_at: string | null
          standard: string
          status: string
          title: string
        }
        Insert: {
          audit_type?: string
          auditor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          release_roles?: string[]
          released?: boolean
          released_at?: string | null
          standard?: string
          status?: string
          title: string
        }
        Update: {
          audit_type?: string
          auditor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          release_roles?: string[]
          released?: boolean
          released_at?: string | null
          standard?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string | null
          summary: string
        }
        Insert: {
          action: string
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string | null
          summary?: string
        }
        Update: {
          action?: string
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          control_name: string
          control_ref: string
          created_at: string
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          control_name: string
          control_ref?: string
          created_at?: string
          id?: string
          organization_id: string
          status?: string
        }
        Update: {
          control_name?: string
          control_ref?: string
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          active_layout: number
          created_at: string
          dataset: Json | null
          id: string
          layouts: Json
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_layout?: number
          created_at?: string
          dataset?: Json | null
          id?: string
          layouts?: Json
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          active_layout?: number
          created_at?: string
          dataset?: Json | null
          id?: string
          layouts?: Json
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nonconformities: {
        Row: {
          assessment_id: string
          corrective_action: string
          created_at: string
          due_date: string | null
          grade: string
          id: string
          item_id: string | null
          organization_id: string
          owner: string
          ref: string
          status: string
          title: string
        }
        Insert: {
          assessment_id: string
          corrective_action?: string
          created_at?: string
          due_date?: string | null
          grade?: string
          id?: string
          item_id?: string | null
          organization_id: string
          owner?: string
          ref?: string
          status?: string
          title: string
        }
        Update: {
          assessment_id?: string
          corrective_action?: string
          created_at?: string
          due_date?: string | null
          grade?: string
          id?: string
          item_id?: string | null
          organization_id?: string
          owner?: string
          ref?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nonconformities_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonconformities_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "assessment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonconformities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          monthly_price: number
          name: string
          seats: number
          subscription_status: string
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_price?: number
          name: string
          seats?: number
          subscription_status?: string
          tier?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_price?: number
          name?: string
          seats?: number
          subscription_status?: string
          tier?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string | null
          policy_level: string
          sub_organization_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          organization_id?: string | null
          policy_level?: string
          sub_organization_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          policy_level?: string
          sub_organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_sub_organization_id_fkey"
            columns: ["sub_organization_id"]
            isOneToOne: false
            referencedRelation: "sub_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_library: {
        Row: {
          code: string
          description: string
          domain: string
          id: string
          keywords: string
          severity: string
          suggested_control: string
          title: string
        }
        Insert: {
          code: string
          description?: string
          domain?: string
          id?: string
          keywords?: string
          severity?: string
          suggested_control?: string
          title: string
        }
        Update: {
          code?: string
          description?: string
          domain?: string
          id?: string
          keywords?: string
          severity?: string
          suggested_control?: string
          title?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          domain: string
          id: string
          organization_id: string
          owner: string
          review_note: string
          reviewed_by: string | null
          severity: string
          status: string
          sub_organization_id: string | null
          title: string
          workflow_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          domain?: string
          id?: string
          organization_id: string
          owner?: string
          review_note?: string
          reviewed_by?: string | null
          severity?: string
          status?: string
          sub_organization_id?: string | null
          title: string
          workflow_status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          domain?: string
          id?: string
          organization_id?: string
          owner?: string
          review_note?: string
          reviewed_by?: string | null
          severity?: string
          status?: string
          sub_organization_id?: string | null
          title?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_sub_organization_id_fkey"
            columns: ["sub_organization_id"]
            isOneToOne: false
            referencedRelation: "sub_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_organizations: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          organization_id: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          organization_id: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_organizations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sub_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_scope_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          sub_organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          sub_organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          sub_organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scope_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scope_roles_sub_organization_id_fkey"
            columns: ["sub_organization_id"]
            isOneToOne: false
            referencedRelation: "sub_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve: { Args: never; Returns: boolean }
      can_audit: { Args: never; Returns: boolean }
      can_view_assessment: { Args: { _id: string }; Returns: boolean }
      current_org: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: never; Returns: boolean }
      is_system_owner: { Args: never; Returns: boolean }
      my_policy: { Args: never; Returns: string }
      org_is_active: { Args: { _org: string }; Returns: boolean }
      user_org: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "system_owner"
        | "org_admin"
        | "manager"
        | "auditor"
        | "standard"
        | "director"
        | "analyst"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "system_owner",
        "org_admin",
        "manager",
        "auditor",
        "standard",
        "director",
        "analyst",
      ],
    },
  },
} as const
