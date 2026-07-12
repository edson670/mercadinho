import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { userFormSchema, type UserFormValues } from '../schemas/user.schema';
import { useCreateUser, useUpdateUser } from '../api/use-users';
import type { User } from '../api/users.api';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null; // undefined/null = criação
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { nome: '', email: '', role: 'CAIXA', senha: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: user?.nome ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'CAIXA',
        senha: '',
      });
    }
  }, [open, user, reset]);

  const onSubmit = async (values: UserFormValues) => {
    // Senha é obrigatória apenas na criação.
    if (!isEdit && !values.senha) {
      setError('senha', { message: 'Senha obrigatória na criação' });
      return;
    }

    if (isEdit && user) {
      await updateMutation.mutateAsync({
        id: user.id,
        payload: {
          nome: values.nome,
          email: values.email,
          role: values.role,
          ...(values.senha ? { senha: values.senha } : {}),
        },
      });
    } else {
      await createMutation.mutateAsync({
        nome: values.nome,
        email: values.email,
        role: values.role,
        senha: values.senha!,
      });
    }
    onOpenChange(false);
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados do usuário.' : 'Cadastre um novo operador do sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Perfil</Label>
            <Select id="role" {...register('role')}>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="GERENTE">Gerente</option>
              <option value="CAIXA">Caixa</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">{isEdit ? 'Nova senha (opcional)' : 'Senha'}</Label>
            <Input id="senha" type="password" placeholder="••••••••" {...register('senha')} />
            {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
