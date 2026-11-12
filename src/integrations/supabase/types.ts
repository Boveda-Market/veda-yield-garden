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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_profiles: {
        Row: {
          avatar: string
          created_at: string
          display_name: string
          privy_user_id: string
          updated_at: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          display_name?: string
          privy_user_id: string
          updated_at?: string
        }
        Update: {
          avatar?: string
          created_at?: string
          display_name?: string
          privy_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_applications: {
        Row: {
          audience: string
          channel: string
          created_at: string
          id: string
          privy_user_id: string
          status: string
        }
        Insert: {
          audience?: string
          channel: string
          created_at?: string
          id?: string
          privy_user_id: string
          status?: string
        }
        Update: {
          audience?: string
          channel?: string
          created_at?: string
          id?: string
          privy_user_id?: string
          status?: string
        }
        Relationships: []
      }
      affiliate_earnings: {
        Row: {
          affiliate_privy_id: string
          commission_raw: number
          created_at: string
          fee_raw: number
          kind: string
          level: number
          paid_at: string | null
          payout_signature: string | null
          referred_privy_id: string
          share_bps: number
          signature: string
          status: string
        }
        Insert: {
          affiliate_privy_id: string
          commission_raw: number
          created_at?: string
          fee_raw: number
          kind: string
          level?: number
          paid_at?: string | null
          payout_signature?: string | null
          referred_privy_id: string
          share_bps: number
          signature: string
          status?: string
        }
        Update: {
          affiliate_privy_id?: string
          commission_raw?: number
          created_at?: string
          fee_raw?: number
          kind?: string
          level?: number
          paid_at?: string | null
          payout_signature?: string | null
          referred_privy_id?: string
          share_bps?: number
          signature?: string
          status?: string
        }
        Relationships: []
      }
      affiliate_upgrade_codes: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          max_uses: number
          share_bps: number
          times_used: number
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          max_uses?: number
          share_bps: number
          times_used?: number
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          max_uses?: number
          share_bps?: number
          times_used?: number
        }
        Relationships: []
      }
      affiliate_upgrade_redemptions: {
        Row: {
          code: string
          privy_user_id: string
          redeemed_at: string
        }
        Insert: {
          code: string
          privy_user_id: string
          redeemed_at?: string
        }
        Update: {
          code?: string
          privy_user_id?: string
          redeemed_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          code: string
          created_at: string
          payout_wallet: string | null
          privy_user_id: string
          share_bps: number
          tier: string
        }
        Insert: {
          code: string
          created_at?: string
          payout_wallet?: string | null
          privy_user_id: string
          share_bps?: number
          tier?: string
        }
        Update: {
          code?: string
          created_at?: string
          payout_wallet?: string | null
          privy_user_id?: string
          share_bps?: number
          tier?: string
        }
        Relationships: []
      }
      email_submissions: {
        Row: {
          consent_version: string
          consented_at: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          consent_version: string
          consented_at?: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          consent_version?: string
          consented_at?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          affiliate_privy_id: string
          created_at: string
          referred_privy_id: string
          wallet: string | null
        }
        Insert: {
          affiliate_privy_id: string
          created_at?: string
          referred_privy_id: string
          wallet?: string | null
        }
        Update: {
          affiliate_privy_id?: string
          created_at?: string
          referred_privy_id?: string
          wallet?: string | null
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          alerts_enabled: boolean
          chat_id: number | null
          code_expires_at: string | null
          created_at: string
          link_code: string | null
          linked_at: string | null
          privy_user_id: string
          username: string | null
        }
        Insert: {
          alerts_enabled?: boolean
          chat_id?: number | null
          code_expires_at?: string | null
          created_at?: string
          link_code?: string | null
          linked_at?: string | null
          privy_user_id: string
          username?: string | null
        }
        Update: {
          alerts_enabled?: boolean
          chat_id?: number | null
          code_expires_at?: string | null
          created_at?: string
          link_code?: string | null
          linked_at?: string | null
          privy_user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      verified_wallets: {
        Row: {
          privy_user_id: string
          verified_at: string
          wallet: string
        }
        Insert: {
          privy_user_id: string
          verified_at?: string
          wallet: string
        }
        Update: {
          privy_user_id?: string
          verified_at?: string
          wallet?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      redeem_affiliate_upgrade: {
        Args: { _code: string; _privy_user_id: string }
        Returns: number
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
    Enums: {},
  },
} as const
