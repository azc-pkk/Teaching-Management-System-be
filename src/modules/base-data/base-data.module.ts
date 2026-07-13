import { Module } from '@nestjs/common';
import { BaseDataController } from './base-data.controller';
import { BaseDataService } from './base-data.service';

@Module({
  controllers: [BaseDataController],
  providers: [BaseDataService],
})
export class BaseDataModule {}
