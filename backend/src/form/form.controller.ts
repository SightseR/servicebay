import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateFieldDto, CreateOptionDto, UpdateFieldDto, UpdateOptionDto } from './dto/field.dto';
import { CreateSectionDto, ReorderDto, UpdateSectionDto } from './dto/section.dto';
import { FormService } from './form.service';

@Controller('form')
export class FormController {
  constructor(private readonly form: FormService) {}

  /** Any active user: the definition used to render the inspection form. */
  @Get('definition')
  definition(@Query('includeInactive') includeInactive?: string) {
    return this.form.getDefinition(includeInactive === 'true' || includeInactive === '1');
  }

  // ---- sections (ADMIN + MANAGER)
  @Roles(Role.ADMIN) @Post('sections')
  createSection(@Body() dto: CreateSectionDto) { return this.form.createSection(dto); }

  @Roles(Role.ADMIN) @Post('sections/reorder') @HttpCode(200)
  reorderSections(@Body() dto: ReorderDto) { return this.form.reorderSections(dto); }

  @Roles(Role.ADMIN) @Patch('sections/:id')
  updateSection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSectionDto) { return this.form.updateSection(id, dto); }

  @Roles(Role.ADMIN) @Delete('sections/:id') @HttpCode(204)
  deleteSection(@Param('id', ParseUUIDPipe) id: string) { return this.form.deleteSection(id); }

  // ---- fields
  @Roles(Role.ADMIN) @Post('sections/:sectionId/fields')
  createField(@Param('sectionId', ParseUUIDPipe) sectionId: string, @Body() dto: CreateFieldDto) { return this.form.createField(sectionId, dto); }

  @Roles(Role.ADMIN) @Post('sections/:sectionId/fields/reorder') @HttpCode(200)
  reorderFields(@Param('sectionId', ParseUUIDPipe) sectionId: string, @Body() dto: ReorderDto) { return this.form.reorderFields(sectionId, dto); }

  @Roles(Role.ADMIN) @Patch('fields/:id')
  updateField(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFieldDto) { return this.form.updateField(id, dto); }

  @Roles(Role.ADMIN) @Delete('fields/:id') @HttpCode(204)
  deleteField(@Param('id', ParseUUIDPipe) id: string) { return this.form.deleteField(id); }

  // ---- options
  @Roles(Role.ADMIN) @Post('fields/:fieldId/options')
  addOption(@Param('fieldId', ParseUUIDPipe) fieldId: string, @Body() dto: CreateOptionDto) { return this.form.addOption(fieldId, dto); }

  @Roles(Role.ADMIN) @Post('fields/:fieldId/options/reorder') @HttpCode(200)
  reorderOptions(@Param('fieldId', ParseUUIDPipe) fieldId: string, @Body() dto: ReorderDto) { return this.form.reorderOptions(fieldId, dto); }

  @Roles(Role.ADMIN) @Patch('options/:id')
  updateOption(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOptionDto) { return this.form.updateOption(id, dto); }

  @Roles(Role.ADMIN) @Delete('options/:id') @HttpCode(204)
  deleteOption(@Param('id', ParseUUIDPipe) id: string) { return this.form.deleteOption(id); }
}
