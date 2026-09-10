import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/types';
import { CreateRecordDto, ListRecordsDto, UpdateRecordDto } from './dto/record.dto';
import { RecordsService } from './records.service';

@Controller('records')
@Roles(Role.ADMIN)
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get() list(@Query() q: ListRecordsDto) { return this.records.list(q); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.records.get(id); }
  @Get(':id/report') report(@Param('id', ParseUUIDPipe) id: string) { return this.records.report(id); }
  @Post() create(@Body() dto: CreateRecordDto, @CurrentUser() u: AuthUser) { return this.records.create(dto, u); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecordDto, @CurrentUser() u: AuthUser) { return this.records.update(id, dto, u); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.records.remove(id, u); }
}
