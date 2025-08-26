/**
 * Output filter definition
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3,
    CRITICAL = 4,
    SILENT = 99
  }
  
  export type LogEventSeverity = Exclude<LogLevel, LogLevel.SILENT>;
  