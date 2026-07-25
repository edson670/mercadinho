import { Module } from '@nestjs/common';
import { LgpdService } from './application/lgpd.service';
import { LgpdController } from './presentation/lgpd.controller';

@Module({
  controllers: [LgpdController],
  providers: [LgpdService],
})
export class LgpdModule {}
