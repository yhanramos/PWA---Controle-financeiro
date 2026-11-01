import type { Database } from './database.types';
// Funções derivadas do schema remoto. Ajustes de nulabilidade aceitos explicitamente pelo SQL.
type Functions = Database['public']['Functions'];
type NullableArgs<F extends { Args: object }, K extends keyof F['Args']> = Omit<
  F,
  'Args'
> & { Args: Omit<F['Args'], K> & { [P in K]: F['Args'][P] | null } };
export type AppDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Omit<
      Functions,
      'create_credit_purchase' | 'update_recurrence'
    > & {
      create_credit_purchase: NullableArgs<
        Functions['create_credit_purchase'],
        'p_month'
      >;
      update_recurrence: NullableArgs<Functions['update_recurrence'], 'p_end'>;
    };
  };
};
