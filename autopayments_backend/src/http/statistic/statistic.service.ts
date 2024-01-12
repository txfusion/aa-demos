import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Statistic } from './entities';
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

@Injectable()
export class StatisticService {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService) {}

  statistic(): Statistic {
    this.logger.log('Statistic');

    return {
      timestamp: Number(new Date()),
    };
  }
}
