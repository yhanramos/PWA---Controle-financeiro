export function requireConnection() {
  if (!navigator.onLine)
    throw new Error('Conecte-se à internet para registrar movimentações.');
}
