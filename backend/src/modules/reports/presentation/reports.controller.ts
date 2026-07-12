import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { ReportsService, ReportType } from '../application/reports.service';
import { PdfExportService } from '../application/pdf-export.service';
import { ExcelExportService } from '../application/excel-export.service';

const VALID_TYPES: ReportType[] = ['sales', 'products', 'stock', 'purchases', 'customers', 'credit'];

@ApiTags('Relatórios')
@ApiBearerAuth()
@Roles(Role.ADMINISTRADOR, Role.GERENTE)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly pdf: PdfExportService,
    private readonly excel: ExcelExportService,
  ) {}

  @Get(':type')
  @ApiParam({ name: 'type', enum: VALID_TYPES })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'format', enum: ['pdf', 'xlsx'], required: false })
  @ApiOperation({ summary: 'Gera e exporta um relatório em PDF ou Excel' })
  async generate(
    @Param('type') type: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    if (!VALID_TYPES.includes(type as ReportType)) {
      throw new BadRequestException(`Tipo de relatório inválido. Use um de: ${VALID_TYPES.join(', ')}`);
    }
    const fmt = format === 'xlsx' ? 'xlsx' : 'pdf';

    const report = await this.reports.build(type as ReportType, from, to);
    const filename = `${type}-${new Date().toISOString().slice(0, 10)}.${fmt}`;

    if (fmt === 'xlsx') {
      const buffer = await this.excel.generate(report);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(buffer);
    } else {
      const buffer = await this.pdf.generate(report);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(buffer);
    }
  }
}
