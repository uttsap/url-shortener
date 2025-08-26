import { Injectable } from '@nestjs/common';
import { AppLogger } from 'lib/logger/logger.service';

@Injectable()
export class AppService {
  constructor(private readonly logger: AppLogger) {}
  getHello(): string {
    this.logger.info('Hello World!');
    return 'Hello World!';
  }
}
