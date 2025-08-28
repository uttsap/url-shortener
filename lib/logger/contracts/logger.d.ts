import type { LogEventContext } from './log-event';
export declare abstract class Logger {
    abstract initialize(): Promise<void>;
    abstract critical(message: unknown, context?: LogEventContext): void;
    abstract error(message: unknown, context?: LogEventContext): void;
    abstract warn(message: unknown, context?: LogEventContext): void;
    abstract info(message: unknown, context?: LogEventContext): void;
    abstract debug(message: unknown, context?: LogEventContext): void;
}
