import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PagePlaceholderProps {
  title: string;
  etapa: string;
  description?: string;
}

/** Placeholder para módulos ainda não implementados (serão substituídos nas próximas etapas). */
export function PagePlaceholder({ title, etapa, description }: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Módulo em construção</p>
          <p className="text-sm text-muted-foreground">
            Será implementado na <span className="font-semibold">{etapa}</span> do roadmap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
