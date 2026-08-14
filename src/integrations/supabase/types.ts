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
      configuracoes: {
        Row: {
          id: string
          imposto_fixo: number
          taxa_bot_fixa: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          imposto_fixo?: number
          taxa_bot_fixa?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          imposto_fixo?: number
          taxa_bot_fixa?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_clients: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          password: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          password: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          password?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_panels: {
        Row: {
          password: string
          updated_at: string
          user_id: string
        }
        Insert: {
          password: string
          updated_at?: string
          user_id: string
        }
        Update: {
          password?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      faturamentos: {
        Row: {
          created_at: string
          data: string
          faturamento_bruto: number
          id: string
          reembolsos_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          faturamento_bruto?: number
          id?: string
          reembolsos_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          faturamento_bruto?: number
          id?: string
          reembolsos_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      fechamentos: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          faturamento_bruto: number
          faturamento_liquido: number
          id: string
          imposto: number
          lucro_real: number
          taxa_percentual: number
          taxa_valor: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          faturamento_bruto: number
          faturamento_liquido: number
          id?: string
          imposto: number
          lucro_real: number
          taxa_percentual: number
          taxa_valor: number
          user_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          faturamento_bruto?: number
          faturamento_liquido?: number
          id?: string
          imposto?: number
          lucro_real?: number
          taxa_percentual?: number
          taxa_valor?: number
          user_id?: string
        }
        Relationships: []
      }
      gastos_anuncios: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          plataforma: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          plataforma?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          plataforma?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      metas: {
        Row: {
          id: string
          meta_diaria: number
          meta_mensal: number
          meta_semanal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          meta_diaria?: number
          meta_mensal?: number
          meta_semanal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          meta_diaria?: number
          meta_mensal?: number
          meta_semanal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sales_limit: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sales_limit: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sales_limit?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_founder: boolean
          notification_preferences: Json
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_founder?: boolean
          notification_preferences?: Json
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_founder?: boolean
          notification_preferences?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          subscription_id: string
          token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          subscription_id: string
          token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          subscription_id?: string
          token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_payment_id: string | null
          plan_id: string
          sales_limit_snapshot: number
          sales_used: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_payment_id?: string | null
          plan_id: string
          sales_limit_snapshot: number
          sales_used?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_payment_id?: string | null
          plan_id?: string
          sales_limit_snapshot?: number
          sales_used?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      syncpay_transactions: {
        Row: {
          amount: number
          beneficiary_name: string | null
          client_document: string | null
          client_email: string | null
          client_name: string | null
          created_at: string
          data_registro: string | null
          external_reference: string | null
          id: string
          liquid_amount: number | null
          pix_key: string | null
          raw_payload: Json | null
          status: string
          taxa_adquirente: number | null
          taxa_deposito: number | null
          transaction_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          beneficiary_name?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          data_registro?: string | null
          external_reference?: string | null
          id?: string
          liquid_amount?: number | null
          pix_key?: string | null
          raw_payload?: Json | null
          status: string
          taxa_adquirente?: number | null
          taxa_deposito?: number | null
          transaction_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          beneficiary_name?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          data_registro?: string | null
          external_reference?: string | null
          id?: string
          liquid_amount?: number | null
          pix_key?: string | null
          raw_payload?: Json | null
          status?: string
          taxa_adquirente?: number | null
          taxa_deposito?: number | null
          transaction_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          client_email: string | null
          client_name: string | null
          created_at: string
          employee_client_id: string | null
          employee_visible: boolean
          gateway: string
          id: string
          liquid_amount: number | null
          raw_payload: Json | null
          status: string
          transaction_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          employee_client_id?: string | null
          employee_visible?: boolean
          gateway: string
          id?: string
          liquid_amount?: number | null
          raw_payload?: Json | null
          status: string
          transaction_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          employee_client_id?: string | null
          employee_visible?: boolean
          gateway?: string
          id?: string
          liquid_amount?: number | null
          raw_payload?: Json | null
          status?: string
          transaction_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_employee_client_id_fkey"
            columns: ["employee_client_id"]
            isOneToOne: false
            referencedRelation: "employee_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          created_at: string
          gateway: string
          id: string
          name: string
          status: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          gateway: string
          id?: string
          name: string
          status?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          gateway?: string
          id?: string
          name?: string
          status?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          employee_client_id: string | null
          id: string
          note: string | null
          owner_note: string | null
          pix_key: string
          requester_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          decided_at?: string | null
          employee_client_id?: string | null
          id?: string
          note?: string | null
          owner_note?: string | null
          pix_key: string
          requester_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          employee_client_id?: string | null
          id?: string
          note?: string | null
          owner_note?: string | null
          pix_key?: string
          requester_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_employee_client_id_fkey"
            columns: ["employee_client_id"]
            isOneToOne: false
            referencedRelation: "employee_clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_process_sale: { Args: { _user_id: string }; Returns: boolean }
      get_available_balance: {
        Args: { _client_id?: string; _user_id: string }
        Returns: number
      }
      get_client_panel_metrics: {
        Args: { _client_id?: string; _owner_id: string }
        Returns: {
          faturamento_liquido: number
          lucro: number
          qtd_pendentes: number
          qtd_vendas: number
          saldo_disponivel: number
          saques_pagos: number
          saques_pendentes: number
          taxa_media_pct: number
          total_imposto: number
          total_pendente: number
          total_reembolsos: number
          total_taxas: number
        }[]
      }
      get_dashboard_metrics:
        | {
            Args: { _periodo?: string; _user_id: string }
            Returns: {
              lucro_total: number
              qtd_reembolsos: number
              qtd_vendas: number
              roi: number
              taxa_bot: number
              taxa_gateway: number
              taxa_media_pct: number
              total_anuncios: number
              total_bruto: number
              total_imposto: number
              total_liquido: number
              total_reembolsos: number
              total_taxas: number
            }[]
          }
        | {
            Args: { _end_date?: string; _start_date?: string; _user_id: string }
            Returns: {
              faturamento_bruto: number
              faturamento_liquido: number
              lucro: number
              qtd_pendentes: number
              qtd_reembolsos: number
              qtd_vendas: number
              roi: number
              saldo_disponivel: number
              total_imposto: number
              total_pendente: number
              total_taxas: number
            }[]
          }
      increment_sale_usage: { Args: { _user_id: string }; Returns: undefined }
      period_start_utc: {
        Args: { _periodo: string; _ref?: string }
        Returns: string
      }
      to_brt_date: { Args: { _ts: string }; Returns: string }
      to_brt_month: { Args: { _ts: string }; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
