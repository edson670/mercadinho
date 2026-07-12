import { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  UserCircle,
  HandCoins,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from '@/stores/toast.store';
import { downloadReport, type ReportFormat, type ReportType } from '../api/reports.api';

const reportTypes: {
  type: ReportType;
  label: string;
  description: string;
  icon: typeof ShoppingCart;
  usesPeriod: boolean;
}[] = [
  { type: 'sales', label: 'Vendas', description: 'Vendas concluídas no período', icon: ShoppingCart, usesPeriod: true },
  { type: 'stock', label: 'Estoque', description: 'Movimentações no período', icon: Boxes, usesPeriod: true },
  { type: 'purchases', label: 'Compras', description: 'Compras registradas no período', icon: Truck, usesPeriod: true },
  { type: 'credit', label: 'Fiado', description: 'Fiados registrados no período', icon: HandCoins, usesPeriod: true },
  { type: 'products', label: 'Produtos', description: 'Catálogo completo de produtos', icon: Package, usesPeriod: false },
  { type: 'customers', label: 'Clientes', description: 'Cadastro completo de clientes', icon: UserCircle, usesPeriod: false },
];

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  const handleDownload = async (type: ReportType, format: ReportFormat, usesPeriod: boolean) => {
    const key = `${type}:${format}`;
    setPending(key);
    try {
      await downloadReport(type, format, usesPeriod ? { from: from || undefined, to: to || undefined } : {});
      toast.success('Relatório gerado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar relatório.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Gere e exporte relatórios em PDF ou Excel" />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">De</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">Até</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Aplica-se aos relatórios de Vendas, Estoque, Compras e Fiado. Produtos e Clientes trazem o cadastro completo.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map(({ type, label, description, icon: Icon, usesPeriod }) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5 text-primary" /> {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={pending === `${type}:pdf`}
                  onClick={() => handleDownload(type, 'pdf', usesPeriod)}
                >
                  {pending === `${type}:pdf` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={pending === `${type}:xlsx`}
                  onClick={() => handleDownload(type, 'xlsx', usesPeriod)}
                >
                  {pending === `${type}:xlsx` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
