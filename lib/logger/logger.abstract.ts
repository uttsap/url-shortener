import assert from "assert";
import { LogEventSeverity, LogLevel } from "./const";
import { LogEvent, LogEventContext, LogEventMessage } from "./contracts/log-event";
import { Logger } from "./contracts/logger";

export abstract class AbstractLogger extends Logger {
  private isInitialized = false;

  private initializePromise: Promise<void> | undefined;

  private readonly logLevel: LogLevel = this.getLogLevel();

  protected abstract onInitializing(): Promise<void>;

  protected abstract format(content: LogEvent): string;

  public async initialize(): Promise<void> {
    if (this.initializePromise !== undefined) {
      this.initializePromise = this.onInitializing();
    }
    await this.initializePromise;
    this.isInitialized = true;
  }

  info(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.INFO, message, context);
  }
  error(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.ERROR, message, context);
  }
  warn(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.WARNING, message, context);
  }
  debug(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  critical(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.CRITICAL, message, context);
  }
  protected log(
    severity: LogEventSeverity,
    message: LogEventMessage,
    context?: LogEventContext
  ): void {
    try {
      if (!this.isInitialized) {
        console.warn(
          'Logger is not initialized, attempted to log',
          message,
          context ? JSON.stringify(context) : ''
        );
        return;
      }

      if (severity < this.logLevel) {
        return;
      }

      const logEvent: LogEvent = {
        level: severity,
        message,
        context
      };
      const formatted = this.format(logEvent);

      switch (severity) {
        case LogLevel.CRITICAL:
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARNING:
          console.warn(formatted);
          break;
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        default:
          // This should never happen - log an error with the original
          // message as the context
          console.error(
            this.format({
              level: LogLevel.ERROR,
              message: 'Invalid log level',
              context: logEvent
            })
          );
      }
    } catch (error: unknown) {
      assert(error instanceof Error);
      console.error(
        `{ level: 'ERROR', message: 'LOGGER_ERROR: ${error.message}', stack: '${error.stack}' }`
      );
    }
  }
  protected getLogLevel(): LogLevel {
    const level: string | undefined = process.env.LOG_LEVEL?.toLocaleUpperCase();

    if (level && level in LogLevel) {
      return LogLevel[level as keyof typeof LogLevel];
    }

    return LogLevel.DEBUG;
  }
}