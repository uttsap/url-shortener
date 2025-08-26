import type { LogEventSeverity } from '../const';

export type LogEventMessage = string | Error;

export type LogEventContext = unknown;

export interface LogEvent {
  message: LogEventMessage;
  level: LogEventSeverity;
  context?: unknown;
}
