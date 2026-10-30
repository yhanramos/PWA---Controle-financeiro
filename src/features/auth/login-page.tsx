import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LockKeyhole, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnline } from '@/hooks/use-online';
import { useAuth } from './hooks/use-auth';
import { AuthStatus } from './components/auth-status';
import { loginSchema, type LoginValues } from './schemas/login-schema';
import { authErrorMessage, signIn } from './services/auth-service';

function destination(state: unknown) {
  if (
    typeof state !== 'object' ||
    state === null ||
    !('from' in state) ||
    typeof state.from !== 'string'
  )
    return '/';
  // Somente rotas internas, sem protocolo, barras duplas ou caminho de login.
  return /^\/(?!\/)[a-z0-9/-]*(?:\?[^\\\r\n]*)?$/i.test(state.from) &&
    !state.from.startsWith('/login')
    ? state.from
    : '/';
}

export function LoginPage() {
  const { status } = useAuth();
  const location = useLocation();
  const online = useOnline();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function submit(values: LoginValues) {
    setError(null);
    try {
      await signIn(values);
      resetField('password');
    } catch (cause: unknown) {
      setError(authErrorMessage(cause));
      resetField('password');
    }
  }

  if (status === 'authenticated')
    return <Navigate to={destination(location.state)} replace />;
  if (status !== 'anonymous') return <AuthStatus />;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <Wallet size={26} />
          <span>clareza.</span>
        </div>
        <span className="eyebrow">SUAS FINANÇAS, NO SEU CONTROLE</span>
        <h1 id="login-title">Bem-vindo de volta</h1>
        <p>Entre para acessar seu espaço financeiro.</p>
        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          aria-busy={isSubmitting}
        >
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              {...register('email')}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="auth-field">
            <label htmlFor="password">Senha</label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>
          {!online && (
            <p className="auth-error" role="status">
              Você está offline. Conecte-se para entrar.
            </p>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting || !online}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
            <LockKeyhole size={16} />
          </Button>
        </form>
        <p className="auth-help">
          Use o e-mail e a senha da sua conta cadastrada. Se precisar de acesso
          ou redefinição de senha, fale com o responsável pelo aplicativo.
        </p>
      </section>
    </main>
  );
}
