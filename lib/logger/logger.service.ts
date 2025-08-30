import { Injectable } from '@nestjs/common';
import { LogLevel } from './const';
import { LogEvent } from './contracts/log-event';
import { AbstractLogger } from './logger.abstract';
import { getRequestId } from './request.context';

@Injectable()
export class AppLogger extends AbstractLogger {
  protected async onInitializing(): Promise<void> {
    return Promise.resolve();
  }

  protected format(content: LogEvent): string {
    const logLevelString: string = LogLevel[content.level].toUpperCase();
    const logMessageString = String(content.message);
    const requestId = getRequestId();

    const baseContext =
      typeof content.context === 'object' && content.context !== null
        ? content.context
        : {};

    // Merge context with requestId if available
    const context = {
      ...(baseContext || {}),
      ...(requestId ? { requestId } : {})
    };

    // If context is empty, return only message
    if (Object.keys(content.context || {}).length === 0) {
      return `${logLevelString} - ${logMessageString}`;
    }

    // Otherwise, include formatted JSON context
    return `${logLevelString} - ${logMessageString}\n${JSON.stringify(context, null, 2)}`;
  }
}
