import { Inject, Injectable, LoggerService, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService) {}

  use(request: Request, reply: Response, next: () => void) {
    const { ip, method, headers, originalUrl } = request;
    const userAgent = headers['user-agent'] ?? '';

    reply.on('finish', () => {
      const { statusCode } = reply;
      const log = { method, originalUrl, statusCode, userAgent, ip };

      this.logger.log('Query', log);
    });

    next();
  }
}
