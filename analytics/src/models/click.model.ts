export interface Click {
  id: number;
  userAlias: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  latency?: number;
  error?: string;
}

export interface CreateClickParams {
  userAlias: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  latency?: number;
  error?: string;
}
