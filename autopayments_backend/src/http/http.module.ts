import { APP_INTERCEPTOR } from '@nestjs/core';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

import { HEALTH_URL } from 'common/health';
import { METRICS_URL } from 'common/prometheus';

import { SWAGGER_URL } from './common/swagger';
import { LoggerMiddleware, MetricsMiddleware } from './common/middleware';
import { CacheModule, CacheControlHeadersInterceptor } from './common/cache';
import { StatisticModule } from './statistic';
import { GreeterModule } from './greeter/greeter.module';
import { AutoPaymentModule } from './auto_payments/auto_payments.module';

@Module({
  imports: [StatisticModule, GreeterModule, AutoPaymentModule, CacheModule],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: CacheControlHeadersInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class HTTPModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware, LoggerMiddleware)
      .exclude(`${SWAGGER_URL}/(.*)`, SWAGGER_URL, METRICS_URL, HEALTH_URL)
      .forRoutes('*');
  }
}
