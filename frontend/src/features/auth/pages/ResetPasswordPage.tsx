import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/api-client';
import { toast } from '@/stores/toast.store';
import { resetPassword } from '../api/auth.api';
import { resetSchema, type ResetForm } from '../schemas/auth.schema';
import { AuthLayout } from '../components/AuthLayout';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: params.get('token') ?? '', novaSenha: '', confirmar: '' },
  });

  const mutation = useMutation({
    mutationFn: (d: ResetForm) => resetPassword(d.token, d.novaSenha),
    onSuccess: (res) => {
      toast.success(res.message);
      navigate('/login');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <KeyRound className="h-7 w-7" />
          </div>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Informe o token e a nova senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input id="token" {...register('token')} />
              {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <Input id="novaSenha" type="password" {...register('novaSenha')} />
              {errors.novaSenha && (
                <p className="text-xs text-destructive">{errors.novaSenha.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input id="confirmar" type="password" {...register('confirmar')} />
              {errors.confirmar && (
                <p className="text-xs text-destructive">{errors.confirmar.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Redefinir senha
            </Button>
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar ao login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
