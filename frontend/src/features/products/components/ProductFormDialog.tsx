import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
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
import { toast } from '@/stores/toast.store';
import { useAllCategories } from '@/features/categories/api/use-categories';
import {
  useCreateProduct,
  useDeleteProductImage,
  useUpdateProduct,
  useUploadProductImage,
} from '../api/use-products';
import { IMAGEM_TAMANHO_MAX, IMAGEM_TIPOS_ACEITOS, type Product } from '../api/products.api';
import {
  productFormSchema,
  unidadeLabels,
  type ProductFormValues,
} from '../schemas/product.schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = Boolean(product);
  const { data: categorias } = useAllCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const uploadImage = useUploadProductImage();
  const deleteImage = useDeleteProductImage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Arquivo escolhido nesta edição (só enviado ao salvar) e a prévia local.
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Marca a remoção da imagem já existente (só se aplica na edição).
  const [removerImagem, setRemoverImagem] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      nome: '',
      codigoBarras: '',
      categoriaId: '',
      precoCompra: 0,
      precoVenda: 0,
      estoque: 0,
      estoqueMinimo: 0,
      unidade: 'UN',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: product?.nome ?? '',
        codigoBarras: product?.codigoBarras ?? '',
        categoriaId: product?.categoriaId ?? '',
        precoCompra: product?.precoCompra ?? 0,
        precoVenda: product?.precoVenda ?? 0,
        estoque: product?.estoque ?? 0,
        estoqueMinimo: product?.estoqueMinimo ?? 0,
        unidade: product?.unidade ?? 'UN',
      });
      // Cada abertura começa limpa: sem arquivo pendente nem flag de remoção
      // de uma edição anterior.
      setImagemFile(null);
      setRemoverImagem(false);
    }
  }, [open, product, reset]);

  // `previewUrl` é um object URL — precisa ser revogado para não vazar memória.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite reescolher o mesmo arquivo depois: sem zerar o value, o
    // onChange não dispara na segunda vez.
    e.target.value = '';
    if (!file) return;

    // As mesmas regras do backend, verificadas antes de subir para dar
    // resposta imediata (o servidor ainda revalida por magic bytes).
    if (!IMAGEM_TIPOS_ACEITOS.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPEG ou WEBP.');
      return;
    }
    if (file.size > IMAGEM_TAMANHO_MAX) {
      toast.error('Imagem muito grande (máximo 2MB).');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setImagemFile(file);
    setRemoverImagem(false);
  };

  const limparImagem = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImagemFile(null);
    // Na edição, marca para apagar a imagem que já estava salva.
    setRemoverImagem(isEdit && Boolean(product?.imagemUrl));
  };

  const onSubmit = async (values: ProductFormValues) => {
    const base = {
      nome: values.nome,
      codigoBarras: values.codigoBarras || undefined,
      categoriaId: values.categoriaId,
      precoCompra: values.precoCompra,
      precoVenda: values.precoVenda,
      estoqueMinimo: values.estoqueMinimo,
      unidade: values.unidade,
    };

    // Salva o produto primeiro — o upload da imagem exige o id, que só existe
    // depois de criar. Uma falha no upload não desfaz o produto já salvo: ele
    // fica gravado e a imagem pode ser reenviada na edição.
    const salvo =
      isEdit && product
        ? await updateMutation.mutateAsync({ id: product.id, payload: base })
        : await createMutation.mutateAsync({ ...base, estoque: values.estoque ?? 0 });

    if (imagemFile) {
      await uploadImage.mutateAsync({ id: salvo.id, file: imagemFile });
    } else if (removerImagem && product?.imagemUrl) {
      await deleteImage.mutateAsync(salvo.id);
    }

    onOpenChange(false);
  };

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadImage.isPending ||
    deleteImage.isPending;

  // O que mostrar na prévia: o arquivo novo, ou a imagem salva (se não foi
  // marcada para remoção).
  const imagemMostrada = previewUrl ?? (removerImagem ? null : (product?.imagemUrl ?? null));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>Cadastro de produto do mercadinho.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Imagem do produto (exibida no catálogo do WhatsApp) */}
          <div className="space-y-2">
            <Label>Imagem do produto</Label>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-card border bg-raised">
                {imagemMostrada ? (
                  <img src={imagemMostrada} alt="Prévia" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={escolherArquivo}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {imagemMostrada ? 'Trocar' : 'Enviar imagem'}
                  </Button>
                  {imagemMostrada && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={limparImagem}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPEG ou WEBP · até 2MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoBarras">Código de barras</Label>
              <Input id="codigoBarras" {...register('codigoBarras')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoriaId">Categoria</Label>
              <Select id="categoriaId" {...register('categoriaId')}>
                <option value="">Selecione...</option>
                {categorias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
              {errors.categoriaId && (
                <p className="text-xs text-destructive">{errors.categoriaId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="precoCompra">Preço de compra (R$)</Label>
              <Input id="precoCompra" type="number" step="0.01" {...register('precoCompra')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precoVenda">Preço de venda (R$)</Label>
              <Input id="precoVenda" type="number" step="0.01" {...register('precoVenda')} />
              {errors.precoVenda && (
                <p className="text-xs text-destructive">{errors.precoVenda.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select id="unidade" {...register('unidade')}>
                {Object.entries(unidadeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estoqueMinimo">Estoque mínimo</Label>
              <Input id="estoqueMinimo" type="number" step="0.001" {...register('estoqueMinimo')} />
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="estoque">Estoque inicial</Label>
                <Input id="estoque" type="number" step="0.001" {...register('estoque')} />
              </div>
            )}
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
