import { useQuery } from '@tanstack/react-query';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listCatalogCategories } from '../api/catalog.api';

interface Props {
  selected: string | null;
  onSelect: (categoriaId: string | null) => void;
}

export function CategoryChips({ selected, onSelect }: Props) {
  const { data: categorias } = useQuery({
    queryKey: ['catalogo', 'categorias'],
    queryFn: listCatalogCategories,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="sticky top-[104px] z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={selected === null} onClick={() => onSelect(null)} icon={<LayoutGrid className="h-3.5 w-3.5" />}>
          Tudo
        </Chip>
        {categorias?.map((cat) => (
          <Chip key={cat.id} active={selected === cat.id} onClick={() => onSelect(cat.id)}>
            {cat.nome}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-accent',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
