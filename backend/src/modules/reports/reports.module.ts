import { Module } from '@nestjs/common';
import { ReportsService } from './application/reports.service';
import { PdfExportService } from './application/pdf-export.service';
import { ExcelExportService } from './application/excel-export.service';
import { ReportsController } from './presentation/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PdfExportService, ExcelExportService],
})
export class ReportsModule {}
