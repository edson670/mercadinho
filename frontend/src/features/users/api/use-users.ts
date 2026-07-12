import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createUser,
  listUsers,
  setUserStatus,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserListParams,
} from './users.api';

const KEY = 'users';

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => listUsers(params),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Usuário criado com sucesso.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Usuário atualizado.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setUserStatus(id, ativo),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(u.ativo ? 'Usuário ativado.' : 'Usuário inativado.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}
