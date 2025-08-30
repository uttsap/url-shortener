export interface Click {
  id: number;
  alias: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  latency?: number;
  error?: string;
}

export interface CreateClickParams {
  alias: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  latency?: number;
  error?: string;
}
