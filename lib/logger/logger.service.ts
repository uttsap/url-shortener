import { Injectable } from '@nestjs/common';
import { AbstractLogger } from './logger.abstract';
import { LogEvent } from './contracts/log-event';
import { LogLevel } from './const';
import { getRequestId } from './request.context';

@Injectable()
export class AppLogger extends AbstractLogger {
  protected async onInitializing(): Promise<void> {
    return Promise.resolve();
  }

  protected format(content: LogEvent): string {
    const logLevelString: string = LogLevel[content.level].toUpperCase();
    const logMessageString: string = String(content.message);
    const requestId = getRequestId();

    // Merge context with requestId if available
    const context = {
      ...(content.context || {}),
      ...(requestId ? { requestId } : {}),
    };

    // If context is empty, return only message
    if (Object.keys(context).length === 0) {
      return `${logLevelString} - ${logMessageString}`;
    }

    // Otherwise, include formatted JSON context
    return `${logLevelString} - ${logMessageString}\n${JSON.stringify(
      context,
      null,
      2
    )}`;
  }
}
