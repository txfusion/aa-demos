import * as winston from 'winston';

export const json = (): winston.Logform.Format => {
  return winston.format.json();
};

export const jsonTransport = (...args: Parameters<typeof json>): winston.transports.ConsoleTransportInstance => {
  return new winston.transports.Console({ format: json(...args) });
};
