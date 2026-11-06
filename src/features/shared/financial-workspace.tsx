import { useState, type FormEvent, type ReactNode } from 'react';
import { ZodError } from 'zod';
import { dataErrorMessage } from '@/services/data-error';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type Field = {
  name: string;
  label: string;
  kind?: 'text' | 'date' | 'month' | 'number' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  showWhen?: { field: string; value: string };
  showAllWhen?: { field: string; value: string }[];
};
type Props = {
  title: string;
  eyebrow: string;
  description: string;
  action: string;
  icon: ReactNode;
  fields: Field[];
  onSave?: (values: Record<string, string>) => Promise<void>;
  rows?: Record<string, string>[];
  note: string;
  formNote?: string;
  records?: ReactNode;
};
export function FinancialWorkspace({
  title,
  eyebrow,
  description,
  action,
  icon,
  fields,
  onSave,
  rows = [],
  note,
  formNote,
  records,
}: Props) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSave) return;
    setBusy(true);
    setError('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<
      string,
      string
    >;
    try {
      await onSave(values);
      form.reset();
      setFieldValues({});
      setOpen(false);
    } catch (error) {
      setError(
        error instanceof ZodError
          ? error.issues.map((issue) => issue.message).join(' ')
          : dataErrorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      <header className="page-heading finance-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <Button
          disabled={busy}
          onClick={() => {
            setOpen(!open);
            setFieldValues({});
          }}
        >
          {action}
        </Button>
      </header>
      {open && (
        <Card className="finance-form-panel">
          <form
            className="finance-form"
            onSubmit={submit}
            onChange={(event) => {
              const target = event.target;
              if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLSelectElement ||
                target instanceof HTMLTextAreaElement
              )
                setFieldValues((values) => ({
                  ...values,
                  [target.name]: target.value,
                }));
            }}
          >
            {fields
              .filter((f) =>
                [
                  ...(f.showWhen ? [f.showWhen] : []),
                  ...(f.showAllWhen ?? []),
                ].every(
                  (condition) =>
                    (fieldValues[condition.field] ??
                      fields.find((field) => field.name === condition.field)
                        ?.defaultValue ??
                      '') === condition.value,
                ),
              )
              .map((f) => (
                <label key={f.name}>
                  {f.label}
                  {f.kind === 'select' ? (
                    <select
                      name={f.name}
                      required={f.required}
                      defaultValue={f.defaultValue ?? ''}
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.kind === 'textarea' ? (
                    <textarea
                      name={f.name}
                      placeholder={f.placeholder}
                      required={f.required}
                      defaultValue={f.defaultValue}
                    />
                  ) : (
                    <input
                      name={f.name}
                      type={f.kind ?? 'text'}
                      placeholder={f.placeholder}
                      required={f.required}
                      min={f.kind === 'number' ? 0 : undefined}
                      defaultValue={f.defaultValue}
                    />
                  )}
                </label>
              ))}
            {formNote && <p className="finance-form-note">{formNote}</p>}
            <div className="finance-form-actions">
              <Button type="submit" disabled={busy || !onSave}>
                {busy ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button
                disabled={busy}
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setFieldValues({});
                }}
              >
                Cancelar
              </Button>
            </div>
            {error && <p role="alert">{error}</p>}
          </form>
        </Card>
      )}
      {records ??
        (rows.length ? (
          <div className="finance-record-list">
            {rows.map((row, i) => (
              <Card key={i} className="finance-record">
                {icon}
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.detail}</span>
                </div>
                <b>{row.value}</b>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="finance-empty">
            {icon}
            <span className="badge">
              {onSave ? 'Sem registros' : 'Somente consulta disponível'}
            </span>
            <h2>
              {onSave
                ? 'Comece adicionando seu primeiro registro'
                : `Nenhum registro de ${title.toLocaleLowerCase()} ainda`}
            </h2>
            <p>{note}</p>
          </Card>
        ))}
    </div>
  );
}
