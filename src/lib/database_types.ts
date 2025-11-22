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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      checkouts: {
        Row: {
          created_at: string
          credit_amount: number | null
          id: string
          metadata: Json | null
          type: string | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          credit_amount?: number | null
          id?: string
          metadata?: Json | null
          type?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          credit_amount?: number | null
          id?: string
          metadata?: Json | null
          type?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          balance_after: number | null
          checkout_id: string | null
          created_at: string | null
          credits_amount: number | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          reason: string | null
          stripe_transaction_id: string | null
          tool_id: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          checkout_id?: string | null
          created_at?: string | null
          credits_amount?: number | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reason?: string | null
          stripe_transaction_id?: string | null
          tool_id?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number | null
          checkout_id?: string | null
          created_at?: string | null
          credits_amount?: number | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reason?: string | null
          stripe_transaction_id?: string | null
          tool_id?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string | null
          pricing_model: Json | null
          tool_id: string | null
          is_custom_plan: boolean | null
          contact_email: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          pricing_model?: Json | null
          tool_id?: string | null
          is_custom_plan?: boolean | null
          contact_email?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          pricing_model?: Json | null
          tool_id?: string | null
          is_custom_plan?: boolean | null
          contact_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_products_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_subscriptions: {
        Row: {
          cancelled_at: string | null
          checkout_id: string | null
          created_at: string | null
          credits_per_period: number
          id: string
          metadata: Json | null
          next_billing_date: string
          period: string
          status: string | null
          tool_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          checkout_id?: string | null
          created_at?: string | null
          credits_per_period: number
          id?: string
          metadata?: Json | null
          next_billing_date: string
          period: string
          status?: string | null
          tool_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          checkout_id?: string | null
          created_at?: string | null
          credits_per_period?: number
          id?: string
          metadata?: Json | null
          next_billing_date?: string
          period?: string
          status?: string | null
          tool_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_subscriptions_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_subscriptions_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_user_links: {
        Row: {
          id: string
          tool_id: string
          onesub_user_id: string
          tool_user_id: string
          link_method: string
          linked_at: string
          last_verified_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          tool_id: string
          onesub_user_id: string
          tool_user_id: string
          link_method: string
          linked_at?: string
          last_verified_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          tool_id?: string
          onesub_user_id?: string
          tool_user_id?: string
          link_method?: string
          linked_at?: string
          last_verified_at?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_user_links_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_user_links_onesub_user_id_fkey"
            columns: ["onesub_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_link_codes: {
        Row: {
          id: string
          code: string
          tool_id: string
          onesub_user_id: string
          created_at: string
          expires_at: string
          used_at: string | null
          is_used: boolean
          tool_user_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          code: string
          tool_id: string
          onesub_user_id: string
          created_at?: string
          expires_at: string
          used_at?: string | null
          is_used?: boolean
          tool_user_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          code?: string
          tool_id?: string
          onesub_user_id?: string
          created_at?: string
          expires_at?: string
          used_at?: string | null
          is_used?: boolean
          tool_user_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_link_codes_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_link_codes_onesub_user_id_fkey"
            columns: ["onesub_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jwks_keys: {
        Row: {
          id: string
          kid: string
          key_type: string
          algorithm: string
          public_key: string
          private_key_ref: string | null
          created_at: string
          expires_at: string | null
          is_active: boolean
          is_primary: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          kid: string
          key_type: string
          algorithm: string
          public_key: string
          private_key_ref?: string | null
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          kid?: string
          key_type?: string
          algorithm?: string
          public_key?: string
          private_key_ref?: string | null
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          updated_at: string | null
          url: string
          user_profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
          url: string
          user_profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
          url?: string
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          is_vendor: boolean | null
          metadata: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          is_vendor?: boolean | null
          metadata?: Json | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_vendor?: boolean | null
          metadata?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          type: string
          use_case: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          type: string
          use_case?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          type?: string
          use_case?: string | null
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          company: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          created_at: string
          credits_consumed: number
          id: string
          metadata: Json | null
          status: string
          tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_consumed: number
          id?: string
          metadata?: Json | null
          status: string
          tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_consumed?: number
          id?: string
          metadata?: Json | null
          status?: string
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payouts: {
        Row: {
          id: string
          vendor_id: string
          credits_amount: number
          euro_amount: number
          status: string
          scheduled_date: string | null
          processed_at: string | null
          stripe_transfer_id: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          credits_amount: number
          euro_amount: number
          status?: string
          scheduled_date?: string | null
          processed_at?: string | null
          stripe_transfer_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          credits_amount?: number
          euro_amount?: number
          status?: string
          scheduled_date?: string | null
          processed_at?: string | null
          stripe_transfer_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_stripe_accounts: {
        Row: {
          id: string
          vendor_id: string
          stripe_account_id: string
          account_status: string
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          stripe_account_id: string
          account_status?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          stripe_account_id?: string
          account_status?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_stripe_accounts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_all_low_balances: {
        Args: { check_threshold?: number }
        Returns: {
          current_balance: number
          threshold: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      consume_credits: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_reason: string
          p_user_id: string
          p_tool_id?: string
          p_metadata?: Json
        }
        Returns: {
          success: boolean
          transaction_id?: string
          balance_before: number
          balance_after: number
          is_duplicate?: boolean
          error?: string
          required?: number
        }
      }
      get_admin_audit_logs: {
        Args: {
          p_action_filter?: string
          p_limit?: number
          p_page?: number
          p_resource_type_filter?: string
        }
        Returns: {
          action: string
          admin_email: string
          admin_name: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json
          old_values: Json
          resource_id: string
          resource_type: string
          total_count: number
          user_agent: string
        }[]
      }
      get_alert_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          low_balance_alerts: number
          recent_alerts: number
          total_alerts: number
        }[]
      }
      increment_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      validate_api_key_hash: {
        Args: { p_key_prefix: string }
        Returns: {
          tool_id: string
          key_hash: string
          tool_name: string
          is_active: boolean
          metadata: Json
        }[]
      }
      update_api_key_usage: {
        Args: { p_tool_id: string }
        Returns: undefined
      }
      process_vendor_application: {
        Args: {
          p_application_id: string
          p_new_status: string
          p_reviewer_id: string
          p_rejection_reason?: string
        }
        Returns: {
          success: boolean
          message: string
          user_id: string | null
        }[]
      }
      get_tool_analytics: {
        Args: {
          p_tool_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          total_uses: number
          total_credits_consumed: number
          unique_users: number
          success_rate: number
          avg_credits_per_use: number
        }[]
      }
      get_user_credit_history: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          transaction_id: string
          credits_amount: number
          balance_after: number
          type: string
          reason: string
          tool_name: string | null
          created_at: string
        }[]
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_ip_address?: unknown
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
