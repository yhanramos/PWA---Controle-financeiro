export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string;
          id: string;
          institution: string | null;
          is_active: boolean;
          kind: string;
          name: string;
          opening_balance_cents: number;
          opening_balance_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          institution?: string | null;
          is_active?: boolean;
          kind?: string;
          name: string;
          opening_balance_cents?: number;
          opening_balance_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institution?: string | null;
          is_active?: boolean;
          kind?: string;
          name?: string;
          opening_balance_cents?: number;
          opening_balance_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          is_active: boolean;
          kind: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind: string;
          name: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          request_id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          request_id: string;
          role: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          request_id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_card_invoices: {
        Row: {
          closing_date: string;
          created_at: string;
          credit_card_id: string;
          due_date: string;
          id: string;
          reference_month: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          closing_date: string;
          created_at?: string;
          credit_card_id: string;
          due_date: string;
          id?: string;
          reference_month: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          closing_date?: string;
          created_at?: string;
          credit_card_id?: string;
          due_date?: string;
          id?: string;
          reference_month?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_card_invoices_user_id_credit_card_id_fkey';
            columns: ['user_id', 'credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'credit_card_invoices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_cards: {
        Row: {
          allows_early_settlement: boolean | null;
          closing_day: number;
          color: string;
          created_at: string;
          credit_limit_cents: number | null;
          due_day: number;
          id: string;
          institution: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allows_early_settlement?: boolean | null;
          closing_day: number;
          color?: string;
          created_at?: string;
          credit_limit_cents?: number | null;
          due_day: number;
          id?: string;
          institution: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          allows_early_settlement?: boolean | null;
          closing_day?: number;
          color?: string;
          created_at?: string;
          credit_limit_cents?: number | null;
          due_day?: number;
          id?: string;
          institution?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_cards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      financial_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          new_data: Json;
          old_data: Json | null;
          record_id: string;
          table_name: string;
          user_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          new_data: Json;
          old_data?: Json | null;
          record_id: string;
          table_name: string;
          user_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          new_data?: Json;
          old_data?: Json | null;
          record_id?: string;
          table_name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'financial_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      installment_plans: {
        Row: {
          category_id: string;
          category_kind: string;
          created_at: string;
          credit_card_id: string;
          description: string;
          first_unpaid_invoice_month: string;
          id: string;
          idempotency_key: string;
          installment_count: number;
          notes: string | null;
          paid_before_tracking: number;
          purchased_on: string;
          status: string;
          total_amount_cents: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          category_kind?: string;
          created_at?: string;
          credit_card_id: string;
          description: string;
          first_unpaid_invoice_month: string;
          id?: string;
          idempotency_key?: string;
          installment_count: number;
          notes?: string | null;
          paid_before_tracking?: number;
          purchased_on: string;
          status?: string;
          total_amount_cents: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category_id?: string;
          category_kind?: string;
          created_at?: string;
          credit_card_id?: string;
          description?: string;
          first_unpaid_invoice_month?: string;
          id?: string;
          idempotency_key?: string;
          installment_count?: number;
          notes?: string | null;
          paid_before_tracking?: number;
          purchased_on?: string;
          status?: string;
          total_amount_cents?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'installment_plans_user_id_category_id_category_kind_fkey';
            columns: ['user_id', 'category_id', 'category_kind'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['user_id', 'id', 'kind'];
          },
          {
            foreignKeyName: 'installment_plans_user_id_credit_card_id_fkey';
            columns: ['user_id', 'credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'installment_plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      installments: {
        Row: {
          amount_cents: number;
          anticipated_on: string | null;
          competence_month: string;
          created_at: string;
          credit_card_id: string;
          discount_cents: number;
          id: string;
          installment_number: number;
          installment_plan_id: string;
          invoice_id: string;
          notes: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          anticipated_on?: string | null;
          competence_month: string;
          created_at?: string;
          credit_card_id: string;
          discount_cents?: number;
          id?: string;
          installment_number: number;
          installment_plan_id: string;
          invoice_id: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          amount_cents?: number;
          anticipated_on?: string | null;
          competence_month?: string;
          created_at?: string;
          credit_card_id?: string;
          discount_cents?: number;
          id?: string;
          installment_number?: number;
          installment_plan_id?: string;
          invoice_id?: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'installments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'installments_user_id_installment_plan_id_credit_card_id_fkey';
            columns: ['user_id', 'installment_plan_id', 'credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'installment_plans';
            referencedColumns: ['user_id', 'id', 'credit_card_id'];
          },
          {
            foreignKeyName: 'installments_user_id_invoice_id_credit_card_id_fkey';
            columns: ['user_id', 'invoice_id', 'credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_card_invoices';
            referencedColumns: ['user_id', 'id', 'credit_card_id'];
          },
        ];
      };
      invoice_payments: {
        Row: {
          account_id: string;
          amount_cents: number;
          created_at: string;
          id: string;
          idempotency_key: string;
          invoice_id: string;
          notes: string | null;
          paid_on: string;
          reversal_reason: string | null;
          reversed_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount_cents: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          invoice_id: string;
          notes?: string | null;
          paid_on: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string;
          amount_cents?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          invoice_id?: string;
          notes?: string | null;
          paid_on?: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_payments_user_id_account_id_fkey';
            columns: ['user_id', 'account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'invoice_payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoice_payments_user_id_invoice_id_fkey';
            columns: ['user_id', 'invoice_id'];
            isOneToOne: false;
            referencedRelation: 'credit_card_invoices';
            referencedColumns: ['user_id', 'id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          currency: string;
          display_name: string;
          id: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          display_name?: string;
          id: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          display_name?: string;
          id?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_transactions: {
        Row: {
          account_id: string | null;
          amount_cents: number;
          category_id: string;
          created_at: string;
          credit_card_id: string | null;
          description: string;
          ends_on: string | null;
          id: string;
          idempotency_key: string;
          interval_count: number;
          interval_unit: string;
          is_active: boolean;
          kind: string;
          notes: string | null;
          payment_method: string;
          starts_on: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          amount_cents: number;
          category_id: string;
          created_at?: string;
          credit_card_id?: string | null;
          description: string;
          ends_on?: string | null;
          id?: string;
          idempotency_key?: string;
          interval_count?: number;
          interval_unit: string;
          is_active?: boolean;
          kind: string;
          notes?: string | null;
          payment_method: string;
          starts_on: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string | null;
          amount_cents?: number;
          category_id?: string;
          created_at?: string;
          credit_card_id?: string | null;
          description?: string;
          ends_on?: string | null;
          id?: string;
          idempotency_key?: string;
          interval_count?: number;
          interval_unit?: string;
          is_active?: boolean;
          kind?: string;
          notes?: string | null;
          payment_method?: string;
          starts_on?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_transactions_user_id_account_id_fkey';
            columns: ['user_id', 'account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'recurring_transactions_user_id_category_id_kind_fkey';
            columns: ['user_id', 'category_id', 'kind'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['user_id', 'id', 'kind'];
          },
          {
            foreignKeyName: 'recurring_transactions_user_id_credit_card_id_fkey';
            columns: ['user_id', 'credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'recurring_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string | null;
          amount_cents: number;
          category_id: string;
          created_at: string;
          credit_card_id: string | null;
          description: string;
          due_date: string;
          id: string;
          idempotency_key: string;
          invoice_id: string | null;
          kind: string;
          notes: string | null;
          occurred_on: string;
          payment_method: string;
          recurrence_on: string | null;
          recurring_transaction_id: string | null;
          settled_on: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          amount_cents: number;
          category_id: string;
          created_at?: string;
          credit_card_id?: string | null;
          description: string;
          due_date: string;
          id?: string;
          idempotency_key?: string;
          invoice_id?: string | null;
          kind: string;
          notes?: string | null;
          occurred_on: string;
          payment_method: string;
          recurrence_on?: string | null;
          recurring_transaction_id?: string | null;
          settled_on?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string | null;
          amount_cents?: number;
          category_id?: string;
          created_at?: string;
          credit_card_id?: string | null;
          description?: string;
          due_date?: string;
          id?: string;
          idempotency_key?: string;
          invoice_id?: string | null;
          kind?: string;
          notes?: string | null;
          occurred_on?: string;
          payment_method?: string;
          recurrence_on?: string | null;
          recurring_transaction_id?: string | null;
          settled_on?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_account_id_fkey';
            columns: ['user_id', 'account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'transactions_user_id_category_id_kind_fkey';
            columns: ['user_id', 'category_id', 'kind'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['user_id', 'id', 'kind'];
          },
          {
            foreignKeyName: 'transactions_user_id_credit_card_id_fkey';
            columns: ['user_id', 'credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_user_id_invoice_id_credit_card_id_fkey';
            columns: ['user_id', 'invoice_id', 'credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_card_invoices';
            referencedColumns: ['user_id', 'id', 'credit_card_id'];
          },
          {
            foreignKeyName: 'transactions_user_id_recurring_transaction_id_kind_fkey';
            columns: ['user_id', 'recurring_transaction_id', 'kind'];
            isOneToOne: false;
            referencedRelation: 'recurring_transactions';
            referencedColumns: ['user_id', 'id', 'kind'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
