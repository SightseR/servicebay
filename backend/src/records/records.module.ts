import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({ imports: [VehiclesModule], controllers: [RecordsController], providers: [RecordsService], exports: [RecordsService] })
export class RecordsModule {}
