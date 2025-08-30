import { Inject, Injectable } from '@nestjs/common';
import { GlideClient, GlideClientConfiguration } from '@valkey/valkey-glide';
import type { HasRedisClientConfig } from 'common/config/contracts';
import { AppLogger } from 'lib/logger/logger.service';
import { CachedJson, CacheResponse } from './contracts/cache.response';

export const RedisJsonCommand = {
  SET: 'JSON.SET',
  GET: 'JSON.GET',
  DEL: 'JSON.DEL'
} as const;

const DEFAULT_PATH = '$';

/**
 * Redis-based implementation of {@link CacheService}.
 *
 * Uses RedisJSON commands (`JSON.SET`, `JSON.GET`, `JSON.DEL`) to store,
 * retrieve, and manage JSON data structures in Redis.
 *
 * Connections are created lazily and can be configured via {@link AppConfig}.
 */
@Injectable()
export class GlideCacheService {
  private glide: GlideClient | null = null;

  /**
   * Creates an instance of RedisCacheService.
   *
   * @param {HasRedisClientConfig} config - Configuration containing the Redis connection details.
   * @param {Logger} logger - Logger instance for warning and error logging.
   */
  constructor(
    @Inject('APP_CONFIG') private readonly config: HasRedisClientConfig,
    private readonly logger: AppLogger
  ) {}

  /**
   * Gracefully disconnects from Redis.
   *
   * Attempts `QUIT` first, falling back to `DISCONNECT` if quitting fails.
   */
  public async destroy(): Promise<void> {
    if (this.glide) {
      try {
        this.glide.close();
      } catch (error) {
        this.logger.warn('Cannot disconnect from Redis', error);
      }
    }
  }

  /**
   * Remove all keys from all Redis databases.
   *
   * @returns {Promise<CacheResponse>} Response indicating success or failure.
   *
   * @example
   * const res = await cache.flushAll();
   * console.log(res.success); // true if flush succeeded
   */
  public async flushAll(): Promise<CacheResponse> {
    try {
      const result = await this.glide?.flushall();
      return {
        success: result === 'OK',
        message:
          result === 'OK'
            ? 'Flush all operation succeeded'
            : 'Flush all operation failed',
        data: null
      };
    } catch (error) {
      this.logger.warn('Cannot flush Redis', error);
      return { success: false, message: (error as Error).message, data: null };
    }
  }

  /**
   * Delete a key or JSON path from Redis.
   *
   * @param {string} key - Redis key to delete.
   * @param {string} [path] - Optional JSON path to remove within the stored value.
   * @returns {Promise<CacheResponse>} Response indicating whether deletion was successful.
   *
   * @example
   * await cache.delCache("user:123");
   * await cache.delCache("user:123", "$.profile");
   */
  public async delCache(key: string, path?: string): Promise<CacheResponse> {
    try {
      const args = path ? [key, path] : [key];
      const result = await this.glide?.customCommand([RedisJsonCommand.DEL, ...args]);
      return {
        success: !!result,
        message: result
          ? `Removed ${key} from cache`
          : `Failed to remove ${key} from cache`,
        data: null
      };
    } catch (error) {
      this.logger.warn('Cannot delete JSON on Redis', error);
      return {
        success: false,
        message: `Failed to remove ${key} from cache: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get a cached JSON value from Redis.
   *
   * @param {string} key - Redis key to retrieve.
   * @param {string | string[]} [path] - Optional JSON path(s) to retrieve specific fields.
   * @returns {Promise<CacheResponse>} Response containing the cached value if found.
   *
   * @example
   * const res = await cache.getCache("user:123");
   * console.log(res.data); // full JSON object
   *
   * const res2 = await cache.getCache("user:123", "$.profile");
   * console.log(res2.data); // specific path inside JSON
   */
  public async getCache(key: string, path?: string | string[]): Promise<CacheResponse> {
    try {
      const redis = await this.getGlideClient();
      let result: unknown;

      if (path) {
        const args = Array.isArray(path)
          ? [RedisJsonCommand.GET, key, ...path]
          : [RedisJsonCommand.GET, key, path];
        result = await redis.customCommand(args);
      } else {
        result = await redis.customCommand([RedisJsonCommand.GET, key]);
      }

      if (result) {
        result = JSON.parse(result as string);
        if (path && Array.isArray(result)) {
          result = result[0];
        }
        return {
          success: true,
          message: `Get cache succeeded, key: ${key}`,
          data: result as CachedJson
        };
      } else {
        return {
          success: false,
          message: `Cache miss, key: ${key}`,
          data: null
        };
      }
    } catch (error) {
      this.logger.warn('Cannot get JSON from Redis', error);
      return { success: false, message: (error as Error).message, data: null };
    }
  }

  /**
   * Save a JSON value to Redis.
   *
   * @param {string} key - Redis key under which to store the value.
   * @param {CachedJson} value - JSON value to store.
   * @param {number} [ttlInSeconds] - Optional time-to-live in seconds before the key expires.
   * @param {string} [path] - Optional JSON path at which to store the value.
   * @returns {Promise<CacheResponse>} Response indicating success or failure.
   *
   * @example
   * await cache.setCache("user:123", { name: "Alice" }, 3600);
   * await cache.setCache("user:123", "newName", undefined, "$.name");
   */
  public async setCache(
    key: string,
    value: CachedJson,
    ttlInSeconds?: number,
    path?: string
  ): Promise<CacheResponse> {
    try {
      const glide = await this.getGlideClient();
      const redisPath = path ?? DEFAULT_PATH;
      const result = await glide?.customCommand([
        RedisJsonCommand.SET,
        key,
        redisPath,
        JSON.stringify(value)
      ]);
      if (result) {
        if (ttlInSeconds) {
          await glide.expire(key, ttlInSeconds);
        }
        return {
          success: true,
          message: `Successfully cached JSON. Key: ${key}`,
          data: value
        };
      }
      return { success: false, message: 'Cache not set', data: null };
    } catch (error) {
      this.logger.warn('Cannot set JSON on Redis', error);
      return {
        success: false,
        message: `Cannot set JSON on Redis: ${error.message}`,
        data: null
      };
    }
  }

  private async getGlideClient(): Promise<GlideClient> {
    if (!this.glide) {
      const url = new URL(this.config.redis.url);
      const options: GlideClientConfiguration = {
        addresses: [
          {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379
          }
        ],
        useTLS: this.config.redis.tls
      };
      this.glide = await GlideClient.createClient(options);
    }
    return this.glide;
  }
}
