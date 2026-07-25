import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from '@/stores/toast.store';
import { MfaSettingsCard } from '@/features/auth/components/MfaSettingsCard';
import { useSettings, useUpdateSettings, useUploadLogo } from '../api/use-settings';

const schema = z.object({
  nome: z.string().min(2, 'Mínimo de 2 caracteres'),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const uploadMutation = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data) {
      reset({
        nome: data.nome,
        cnpj: data.cnpj ?? '',
        endereco: data.endereco ?? '',
        telefone: data.telefone ?? '',
      });
    }
  }, [data, reset]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      nome: values.nome,
      cnpj: values.cnpj || undefined,
      endereco: values.endereco || undefined,
      telefone: values.telefone || undefined,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Imagem muito grande (máx. 2MB).');
      return;
    }
    setPreview(URL.createObjectURL(file));
    await uploadMutation.mutateAsync(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const logoSrc = preview ?? data?.logoUrl ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Dados cadastrais da empresa" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Logotipo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Logotipo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {logoSrc ? (
                <img src={logoSrc} alt="Logotipo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Enviar logotipo
            </Button>
            <p className="text-center text-xs text-muted-foreground">PNG, JPEG ou WEBP — até 2MB</p>
          </CardContent>
        </Card>

        {/* Dados da empresa */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dados da empresa</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" {...register('nome')} />
                    {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" {...register('cnpj')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" {...register('telefone')} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input id="endereco" {...register('endereco')} />
                  </div>
                </div>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <MfaSettingsCard />
        </div>
      </div>
    </div>
  );
}
