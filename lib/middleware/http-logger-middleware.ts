import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppLogger } from 'lib/logger/logger.service';
import { requestContext } from 'lib/logger/request.context';
import { generateUri } from '../uri';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = generateUri(24);
    const start = Date.now();

    requestContext.run({ requestId }, () => {
      const logContext = {
        method: req.method,
        path: req.originalUrl || req.url,
        remoteAddr: req.ip,
        userAgent: req.get('user-agent') || '',
        requestId
      };

      this.logger.info('Incoming request', logContext);

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info('Request completed', {
          ...logContext,
          status: res.statusCode,
          bytes: res.get('Content-Length') || 0,
          duration: `${duration}ms`
        });
      });

      next();
    });
  }
}
