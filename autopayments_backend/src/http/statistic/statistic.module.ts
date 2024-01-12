import { Module } from '@nestjs/common';
import { StatisticController } from './statistic.controller';
import { StatisticService } from './statistic.service';
import { LoggerModule } from "common/logger";

@Module({
  imports: [LoggerModule],
  controllers: [StatisticController],
  providers: [StatisticService],
})
export class StatisticModule {}
