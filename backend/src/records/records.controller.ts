import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/types';
import { CreateRecordDto, ListRecordsDto, UpdateRecordDto } from './dto/record.dto';
import { ExportService } from './export.service';
import { RecordsService } from './records.service';

@Controller('records')
@Roles(Role.ADMIN)
export class RecordsController {
  constructor(private readonly records: RecordsService, private readonly exporter: ExportService) {}

  @Get() list(@Query() q: ListRecordsDto) { return this.records.list(q); }

  /** Same filters as the list; ?lang=it|en picks header language and delimiter (it → ';' for Italian Excel). */
  @Get('export.csv')
  @Header('Cache-Control', 'no-store')
  async exportCsv(@Query() q: ListRecordsDto, @Query('lang') lang: string | undefined, @Res() res: Response) {
    const { csv, filename } = await this.exporter.recordsCsv(q, lang === 'it' ? 'it' : 'en');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.records.get(id); }
  @Get(':id/report') report(@Param('id', ParseUUIDPipe) id: string) { return this.records.report(id); }
  @Post() create(@Body() dto: CreateRecordDto, @CurrentUser() u: AuthUser) { return this.records.create(dto, u); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecordDto, @CurrentUser() u: AuthUser) { return this.records.update(id, dto, u); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.records.remove(id, u); }
}
