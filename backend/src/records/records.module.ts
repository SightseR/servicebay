import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { RecordsController } from './records.controller';
import { ExportService } from './export.service';
import { RecordsService } from './records.service';

@Module({ imports: [VehiclesModule], controllers: [RecordsController], providers: [RecordsService, ExportService], exports: [RecordsService] })
export class RecordsModule {}
