import { LogEventSeverity, LogLevel } from './const';
import { LogEvent, LogEventContext, LogEventMessage } from './contracts/log-event';
import { Logger } from './contracts/logger';

export abstract class AbstractLogger extends Logger {
  private isInitialized = false;
  private initializePromise?: Promise<void>;
  private readonly logLevel: LogLevel = this.getLogLevel();

  public async initialize(): Promise<void> {
    this.initializePromise ??= this.onInitializing();
    await this.initializePromise;
    this.isInitialized = true;
  }

  public info(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  public error(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  public warn(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.WARNING, message, context);
  }

  public debug(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public critical(message: LogEventMessage, context?: LogEventContext): void {
    this.log(LogLevel.CRITICAL, message, context);
  }

  protected log(
    severity: LogEventSeverity,
    message: LogEventMessage,
    context?: LogEventContext
  ): void {
    if (!this.isInitialized) return;
    if (severity < this.logLevel) return;

    const logEvent: LogEvent = { level: severity, message, context };
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
        console.error(
          this.format({
            level: LogLevel.ERROR,
            message: 'Invalid log level',
            context: logEvent
          })
        );
    }
  }

  protected getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    if (level && level in LogLevel) {
      return LogLevel[level as keyof typeof LogLevel];
    }
    return LogLevel.DEBUG;
  }

  protected abstract onInitializing(): Promise<void>;
  protected abstract format(content: LogEvent): string;
}
