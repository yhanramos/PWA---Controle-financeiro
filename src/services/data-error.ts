export type DataErrorCode =
  | 'offline'
  | 'session'
  | 'schema'
  | 'permission'
  | 'conflict'
  | 'invalid'
  | 'unavailable';

export class DataError extends Error {
  constructor(
    public readonly code: DataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

export function databaseError(error: { code?: string }) {
  if (error.code === '42501')
    return new DataError(
      'permission',
      'Sua conta não tem permissão para concluir esta operação.',
    );
  if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? ''))
    return new DataError(
      'schema',
      'O banco precisa ser atualizado. Entre em contato com o responsável pelo aplicativo.',
    );
  if (['PGRST301', 'PGRST302', 'PGRST303'].includes(error.code ?? ''))
    return new DataError('session', 'Sua sessão expirou. Entre novamente.');
  if (error.code === '23505')
    return new DataError(
      'conflict',
      'Este registro já existe. Atualize a página antes de tentar novamente.',
    );
  if (['23503', '23514', '23502'].includes(error.code ?? ''))
    return new DataError(
      'invalid',
      'Os dados não atendem às regras de cadastro. Confira os campos informados.',
    );
  return new DataError(
    'unavailable',
    'Não foi possível acessar seus dados. Verifique a conexão e tente novamente.',
  );
}

export function dataErrorMessage(error: unknown) {
  return error instanceof DataError
    ? error.message
    : 'Não foi possível concluir a operação. Tente novamente.';
}

export function retryDataQuery(failureCount: number, error: unknown) {
  return (
    error instanceof DataError &&
    error.code === 'unavailable' &&
    failureCount < 1
  );
}
