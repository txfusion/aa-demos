import { Injectable, NestMiddleware } from '@nestjs/common';
import { PrometheusService } from 'common/prometheus';
import { Request, Response } from 'express';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(protected readonly prometheusService: PrometheusService) {}

  use(request: Request, reply: Response, next: () => void) {
    const { method } = request;

    const endTimer = this.prometheusService.httpRequestDuration.startTimer({
      method,
    });

    reply.on('finish', () => {
      const { statusCode } = reply;
      endTimer({ statusCode });
    });

    next();
  }
}
