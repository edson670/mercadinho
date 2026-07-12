import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { TabularReport } from './pdf-export.service';

/** Gera planilhas Excel a partir de {title, columns, rows} — reutilizável por qualquer relatório. */
@Injectable()
export class ExcelExportService {
  async generate(report: TabularReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Mercadinho';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(report.title.slice(0, 31) || 'Relatório');

    sheet.columns = report.columns.map((header) => ({
      header,
      key: header,
      width: Math.max(15, header.length + 4),
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };

    for (const row of report.rows) {
      sheet.addRow(row);
    }

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: report.columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
