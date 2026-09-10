import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  get() {
    return this.prisma.companyProfile.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
  }

  /** Logo upload arrives in Chunk 10 (multipart → /uploads). */
  @Roles(Role.ADMIN)
  @Put()
  update(@Body() dto: UpdateCompanyDto) {
    return this.prisma.companyProfile.upsert({ where: { id: 'default' }, update: dto, create: { id: 'default', ...dto } });
  }
}
