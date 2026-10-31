import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  description?: string;
  error?: boolean;
  loading?: boolean;
  onRetry?: () => void;
};
export function DataState({
  title,
  description,
  error,
  loading,
  onRetry,
}: Props) {
  return (
    <div
      className="data-state"
      role={error ? 'alert' : 'status'}
      aria-busy={loading || undefined}
    >
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
