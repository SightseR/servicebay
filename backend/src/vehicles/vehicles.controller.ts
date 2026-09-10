import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateVehicleDto, ListVehiclesDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@Roles(Role.ADMIN)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get() list(@Query() q: ListVehiclesDto) { return this.vehicles.list(q); }

  /** GET /vehicles/by-reg/ABC-123 → vehicle or null (200 either way; frontend decides create-vs-reuse) */
  @Get('by-reg/:reg') byReg(@Param('reg') reg: string) { return this.vehicles.findByReg(reg); }

  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.vehicles.get(id); }
  @Post() create(@Body() dto: CreateVehicleDto) { return this.vehicles.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) { return this.vehicles.update(id, dto); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseUUIDPipe) id: string) { return this.vehicles.remove(id); }
}
