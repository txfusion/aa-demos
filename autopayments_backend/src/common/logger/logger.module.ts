import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigModule, ConfigService, LogFormat } from 'common/config';
import { jsonTransport } from 'common/logger/transports/json.transport';
import { simpleTransport } from 'common/logger/transports/simple.transport';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const level = configService.get('LOG_LEVEL');
        const format = configService.get('LOG_FORMAT');
        const isJSON = format === LogFormat.json;

        const transports = isJSON ? jsonTransport() : simpleTransport();

        return { level, transports };
      },
    }),
  ],
})
export class LoggerModule {}
