import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/shared/data-state';
import { useOnline } from '@/hooks/use-online';
import { dataErrorMessage } from '@/services/data-error';
import { useProfile, useUpdateProfile } from '../hooks/use-profile';
import {
  profileFormSchema,
  type Profile,
  type ProfileFormValues,
} from '../schemas/profile-schema';

function ProfileForm({ profile }: { profile: Profile }) {
  const online = useOnline();
  const mutation = useUpdateProfile();
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { display_name: profile.display_name },
  });
  useEffect(() => {
    if (!isDirty) reset({ display_name: profile.display_name });
  }, [profile.display_name, isDirty, reset]);

  async function submit(values: ProfileFormValues) {
    setFeedback(null);
    try {
      const saved = await mutation.mutateAsync(values);
      reset({ display_name: saved.display_name });
      setFeedback({ error: false, message: 'Seu nome foi salvo.' });
    } catch (error: unknown) {
      setFeedback({ error: true, message: dataErrorMessage(error) });
    }
  }
  return (
    <form
      className="profile-form"
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-busy={isSubmitting}
    >
      <div className="profile-field">
        <label htmlFor="display-name">Como podemos chamar você?</label>
        <input
          id="display-name"
          autoComplete="nickname"
          maxLength={120}
          {...register('display_name', { onChange: () => setFeedback(null) })}
          aria-invalid={Boolean(errors.display_name)}
          aria-describedby={
            errors.display_name ? 'display-name-error' : 'display-name-help'
          }
          disabled={isSubmitting}
        />
        <p id="display-name-help">
          Opcional. Seu nome não altera o e-mail de acesso.
        </p>
        {errors.display_name && (
          <p id="display-name-error" role="alert">
            {errors.display_name.message}
          </p>
        )}
      </div>
      <dl className="profile-details">
        <div>
          <dt>Moeda</dt>
          <dd>Real brasileiro (BRL)</dd>
        </div>
        <div>
          <dt>Fuso horário</dt>
          <dd>{profile.timezone}</dd>
        </div>
      </dl>
      {!online && <p role="status">Conecte-se para salvar alterações.</p>}
      {feedback && (
        <p
          className={
            feedback.error ? 'form-feedback--error' : 'form-feedback--success'
          }
          role={feedback.error ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
      <Button type="submit" disabled={!online || !isDirty || isSubmitting}>
        {isSubmitting ? 'Salvando…' : 'Salvar nome'}
      </Button>
    </form>
  );
}

export function ProfilePanel() {
  const query = useProfile();
  return (
    <Card className="settings-panel">
      <UserRound size={28} />
      <h2>Seu perfil</h2>
      {query.isPending ? (
        <DataState title="Carregando seu perfil…" loading />
      ) : query.isError ? (
        <DataState
          title="Não foi possível carregar seu perfil"
          description={dataErrorMessage(query.error)}
          error
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <DataState
          title="Seu perfil ainda não está disponível"
          description="Entre em contato com o responsável pelo aplicativo para concluir a configuração da sua conta."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <ProfileForm key={query.data.id} profile={query.data} />
      )}
    </Card>
  );
}
