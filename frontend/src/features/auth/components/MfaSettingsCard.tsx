import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { mfaCodeSchema, type MfaCodeForm } from '../schemas/auth.schema';
import { mfaDisable, mfaEnable, mfaSetup, type MfaSetupResponse } from '../api/auth.api';

type Etapa = 'fechado' | 'qrcode' | 'recovery';

/** Card de ativação/desativação do MFA (TOTP) — recomendado para ADMINISTRADOR/GERENTE. */
export function MfaSettingsCard() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [etapa, setEtapa] = useState<Etapa>('fechado');
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disableOpen, setDisableOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MfaCodeForm>({ resolver: zodResolver(mfaCodeSchema), defaultValues: { codigo: '' } });

  const {
    register: registerDisable,
    handleSubmit: handleSubmitDisable,
    reset: resetDisable,
    formState: { errors: disableErrors },
  } = useForm<{ senha: string; codigo: string }>({ defaultValues: { senha: '', codigo: '' } });

  const setupMutation = useMutation({
    mutationFn: mfaSetup,
    onSuccess: (data) => {
      setSetupData(data);
      setEtapa('qrcode');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const enableMutation = useMutation({
    mutationFn: (values: MfaCodeForm) => mfaEnable(values.codigo),
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setEtapa('recovery');
      patchUser({ mfaEnabled: true });
      reset();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const disableMutation = useMutation({
    mutationFn: (values: { senha: string; codigo: string }) => mfaDisable(values.senha, values.codigo),
    onSuccess: () => {
      toast.success('MFA desativado.');
      patchUser({ mfaEnabled: false });
      setDisableOpen(false);
      resetDisable();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const fecharFluxo = () => {
    setEtapa('fechado');
    setSetupData(null);
    setRecoveryCodes([]);
    reset();
  };

  const copiarCodigos = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('Códigos copiados.');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Verificação em duas etapas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Exige um código do seu celular (além da senha) para entrar — recomendado para
          Administradores e Gerentes.
        </p>

        {user?.mfaEnabled ? (
          <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Ativo
            </span>
            <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
              <ShieldOff className="h-4 w-4" /> Desativar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Ativar verificação em duas etapas
          </Button>
        )}
      </CardContent>

      {/* Passo 1: escanear QR code e confirmar com um código */}
      <Dialog open={etapa === 'qrcode'} onOpenChange={(open) => !open && fecharFluxo()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>
              Use o Google Authenticator, Microsoft Authenticator ou similar.
            </DialogDescription>
          </DialogHeader>
          {setupData && (
            <form onSubmit={handleSubmit((d) => enableMutation.mutate(d))} className="space-y-4">
              <div className="flex justify-center">
                <img src={setupData.qrCodeDataUrl} alt="QR Code do MFA" className="h-48 w-48" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">Ou digite manualmente:</p>
                <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                  {setupData.manualEntryKey}
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfa-codigo">Código do app</Label>
                <Input id="mfa-codigo" inputMode="numeric" autoFocus placeholder="123456" {...register('codigo')} />
                {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={fecharFluxo}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={enableMutation.isPending}>
                  {enableMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar e ativar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Passo 2: códigos de recuperação — mostrados uma única vez */}
      <Dialog open={etapa === 'recovery'} onOpenChange={(open) => !open && fecharFluxo()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guarde seus códigos de recuperação</DialogTitle>
            <DialogDescription>
              Cada código funciona uma única vez, caso você perca acesso ao app autenticador. Eles
              não serão mostrados novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
            {recoveryCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copiarCodigos}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button onClick={fecharFluxo}>Já guardei — concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Desativar — exige senha + código, para não bastar um token roubado */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar verificação em duas etapas</DialogTitle>
            <DialogDescription>Confirme sua senha e um código para desativar.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmitDisable((d) => disableMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="disable-senha">Senha atual</Label>
              <Input
                id="disable-senha"
                type="password"
                {...registerDisable('senha', { required: 'Informe a senha' })}
              />
              {disableErrors.senha && (
                <p className="text-xs text-destructive">{disableErrors.senha.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-codigo">Código do app ou de recuperação</Label>
              <Input
                id="disable-codigo"
                inputMode="numeric"
                {...registerDisable('codigo', { required: 'Informe o código' })}
              />
              {disableErrors.codigo && (
                <p className="text-xs text-destructive">{disableErrors.codigo.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDisableOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={disableMutation.isPending}>
                {disableMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Desativar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
