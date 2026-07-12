import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/api-client';
import { toast } from '@/stores/toast.store';
import { forgotPassword } from '../api/auth.api';
import { forgotSchema, type ForgotForm } from '../schemas/auth.schema';
import { AuthLayout } from '../components/AuthLayout';

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const mutation = useMutation({
    mutationFn: (d: ForgotForm) => forgotPassword(d.email),
    onSuccess: (res) => toast.success(res.message),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MailCheck className="h-7 w-7" />
          </div>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Enviaremos instruções para seu e-mail</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@mercado.local" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar instruções
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
