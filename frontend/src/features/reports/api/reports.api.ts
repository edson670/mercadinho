import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';

export type ReportType = 'sales' | 'products' | 'stock' | 'purchases' | 'customers' | 'credit';
export type ReportFormat = 'pdf' | 'xlsx';

interface DownloadParams {
  from?: string;
  to?: string;
}

/** Baixa o relatório gerado pelo backend e dispara o download no navegador. */
export async function downloadReport(
  type: ReportType,
  format: ReportFormat,
  params: DownloadParams = {},
): Promise<void> {
  try {
    const response = await apiClient.get(`/reports/${type}`, {
      params: { format, ...params },
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    if (err instanceof AxiosError && err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        const parsed = JSON.parse(text);
        throw new Error(
          Array.isArray(parsed.message) ? parsed.message.join(', ') : (parsed.message ?? 'Erro ao gerar relatório.'),
        );
      } catch {
        throw new Error('Erro ao gerar relatório.');
      }
    }
    throw new Error('Erro ao gerar relatório.');
  }
}
