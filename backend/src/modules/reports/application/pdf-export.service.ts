import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import PdfPrinter from 'pdfmake/src/printer';

const FONTS_DIR = join(__dirname, '..', 'assets', 'fonts');

const fonts = {
  Roboto: {
    normal: join(FONTS_DIR, 'Roboto-Regular.ttf'),
    bold: join(FONTS_DIR, 'Roboto-Medium.ttf'),
    italics: join(FONTS_DIR, 'Roboto-Italic.ttf'),
    bolditalics: join(FONTS_DIR, 'Roboto-MediumItalic.ttf'),
  },
};

export interface TabularReport {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
}

/** Gera PDFs tabulares simples a partir de {title, columns, rows} — reutilizável por qualquer relatório. */
@Injectable()
export class PdfExportService {
  private readonly printer = new PdfPrinter(fonts);

  async generate(report: TabularReport): Promise<Buffer> {
    const docDefinition = {
      pageMargins: [30, 50, 30, 30] as [number, number, number, number],
      content: [
        { text: report.title, style: 'header' },
        ...(report.subtitle ? [{ text: report.subtitle, style: 'subheader' }] : []),
        {
          table: {
            headerRows: 1,
            widths: report.columns.map(() => '*'),
            body: [
              report.columns.map((c) => ({ text: c, style: 'tableHeader' })),
              ...report.rows.map((row) => row.map((cell) => ({ text: String(cell), style: 'cell' }))),
            ],
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#1a5cad' : rowIndex % 2 === 0 ? '#f8fafc' : null),
            hLineColor: () => '#e2e8f0',
            vLineColor: () => '#e2e8f0',
          },
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
        subheader: { fontSize: 10, color: '#64748b', margin: [0, 0, 0, 12] as [number, number, number, number] },
        tableHeader: { bold: true, fontSize: 9, color: '#ffffff' },
        cell: { fontSize: 9 },
      },
      defaultStyle: { font: 'Roboto' },
    };

    return new Promise((resolve, reject) => {
      try {
        const doc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
