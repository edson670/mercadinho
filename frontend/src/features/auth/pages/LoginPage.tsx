import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, LogIn, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { getApiErrorMessage } from '@/lib/api-client';
import { toast } from '@/stores/toast.store';
import { login, mfaVerify } from '../api/auth.api';
import { loginSchema, mfaCodeSchema, type LoginForm, type MfaCodeForm } from '../schemas/auth.schema';
import { AuthLayout } from '../components/AuthLayout';

export function LoginPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  // Preenchido só quando a conta tem MFA ativo — troca o formulário de
  // e-mail/senha pelo de código, sem navegar (o mfaToken vive só nesta tela).
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  });

  const {
    register: registerMfa,
    handleSubmit: handleSubmitMfa,
    formState: { errors: mfaErrors },
  } = useForm<MfaCodeForm>({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { codigo: '' },
  });

  const onLoginSuccess = (data: { user: Parameters<typeof setSession>[0]['user']; accessToken: string; mfaSetupRecommended?: boolean }) => {
    setSession({ user: data.user, accessToken: data.accessToken });
    toast.success(`Bem-vindo, ${data.user.nome.split(' ')[0]}!`);
    if (data.mfaSetupRecommended) {
      toast.info('Recomendamos ativar a verificação em duas etapas em Configurações.');
    }
    navigate(from, { replace: true });
  };

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        return;
      }
      onLoginSuccess(data);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const mfaMutation = useMutation({
    mutationFn: (values: MfaCodeForm) => mfaVerify(mfaToken as string, values.codigo),
    onSuccess: onLoginSuccess,
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (mfaToken) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" /> Verificação em duas etapas
            </CardTitle>
            <CardDescription>Digite o código do seu app autenticador</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitMfa((d) => mfaMutation.mutate(d))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  inputMode="numeric"
                  autoFocus
                  placeholder="123456"
                  {...registerMfa('codigo')}
                />
                {mfaErrors.codigo && (
                  <p className="text-xs text-destructive">{mfaErrors.codigo.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Sem acesso ao app? Use um dos seus códigos de recuperação.
                </p>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={mfaMutation.isPending}>
                {mfaMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMfaToken(null)}
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>Digite suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@mercado.local" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link to="/recuperar-senha" className="text-xs text-muted-foreground hover:text-primary">
                  Esqueci minha senha
                </Link>
              </div>
              <Input id="senha" type="password" placeholder="••••••••" {...register('senha')} />
              {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
