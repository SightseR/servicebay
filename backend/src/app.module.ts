import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { CompanyModule } from './company/company.module';
import { FormModule } from './form/form.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RecordsModule } from './records/records.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), PrismaModule, AuthModule, UsersModule, FormModule, VehiclesModule, RecordsModule, CompanyModule],
  controllers: [HealthController],
})
export class AppModule {}
