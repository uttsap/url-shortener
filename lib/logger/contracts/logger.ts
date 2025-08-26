import type { LogEventContext } from './log-event';

/**
 * Provides methods to log messages.
 */
export abstract class Logger {
  public abstract initialize(): Promise<void>;

  public abstract critical(message: unknown, context?: LogEventContext): void;

  public abstract error(message: unknown, context?: LogEventContext): void;

  public abstract warn(message: unknown, context?: LogEventContext): void;

  public abstract info(message: unknown, context?: LogEventContext): void;

  public abstract debug(message: unknown, context?: LogEventContext): void;
}
