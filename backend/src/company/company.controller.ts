import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Put, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/company.dto';
import { MAX_LOGO_BYTES } from './image-signature';

@Controller('company')
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  get() {
    return this.company.get();
  }

  @Roles(Role.ADMIN)
  @Put()
  update(@Body() dto: UpdateCompanyDto) {
    return this.company.update(dto);
  }

  /** multipart/form-data with a single `logo` file field. Validated by magic bytes in the service. */
  @Roles(Role.ADMIN)
  @Post('logo')
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage(), limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }))
  uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "logo")');
    return this.company.setLogo(file.buffer);
  }

  @Roles(Role.ADMIN)
  @Delete('logo')
  @HttpCode(200)
  clearLogo() {
    return this.company.clearLogo();
  }
}
