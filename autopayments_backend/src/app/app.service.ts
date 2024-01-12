import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { PrometheusService } from 'common/prometheus';
import { APP_NAME, APP_VERSION } from './app.constants';
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,

    protected readonly configService: ConfigService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const env = this.configService.get('NODE_ENV');
    const version = APP_VERSION;
    const name = APP_NAME;

    this.prometheusService.buildInfo.labels({ env, name, version }).inc();
    this.logger.log('Init app', { env, name, version });
  }
}
