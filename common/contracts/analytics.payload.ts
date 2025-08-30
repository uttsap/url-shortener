export interface AnalyticsPayload {
    alias: string;
    ip?: string;
    userAgent?: string;
    referrer?: string;
    latency?: number;
    error?: string;
}