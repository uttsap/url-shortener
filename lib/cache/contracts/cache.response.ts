/**
 * Represents the supported JSON-compatible value types that can be stored in cache.
 */
export type CachedJson =
  | null
  | boolean
  | number
  | string
  | Date
  | Array<Record<string, unknown>>
  | Record<string, unknown>;

export interface CacheResponse {
  success: boolean;

  message?: string;

  /** The data retrieved or affected by the operation. */
  data?: CachedJson;
}
