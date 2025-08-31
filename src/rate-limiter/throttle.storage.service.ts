import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { GlideClient, GlideClientConfiguration } from '@valkey/valkey-glide';

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage, OnModuleDestroy {
  private readonly scriptSrc: string;
  private glide: GlideClient | null = null;

  constructor(
    private readonly redisUrl: string,
    private readonly useTLS: boolean
  ) {
    this.scriptSrc = this.getScriptSrc();
  }

  getScriptSrc(): string {
    return `
        local hitKey = KEYS[1]
        local blockKey = KEYS[2]
        local throttlerName = ARGV[1]
        local ttl = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local blockDuration = tonumber(ARGV[4])

        local totalHits = redis.call('INCR', hitKey)
        local timeToExpire = redis.call('PTTL', hitKey)
        
        if timeToExpire <= 0 then
            redis.call('PEXPIRE', hitKey, ttl)
            timeToExpire = ttl
        end

        local isBlocked = redis.call('GET', blockKey)
        local timeToBlockExpire = 0

        if isBlocked then
            timeToBlockExpire = redis.call('PTTL', blockKey)
        elseif totalHits > limit then
            redis.call('SET', blockKey, 1, 'PX', blockDuration)
            isBlocked = '1'
            timeToBlockExpire = blockDuration
        end

        if isBlocked and timeToBlockExpire <= 0 then
            redis.call('DEL', blockKey)
            redis.call('SET', hitKey, 1, 'PX', ttl)
            totalHits = 1
            timeToExpire = ttl
            isBlocked = false
        end

        return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
        `
      .replace(/^\s+/gm, '')
      .trim();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    const ttlMs = ttl * 1000;
    const blockDurationMs = blockDuration * 1000;

    const hitKey = `throttle:${key}:${throttlerName}:hits`;
    const blockKey = `throttle:${key}:${throttlerName}:blocked`;

    try {
      const client = await this.getGlideClient();

      // Use a simpler approach first - let's try basic Redis commands
      const currentHits = await client.get(hitKey);
      const isBlocked = await client.get(blockKey);

      if (isBlocked) {
        const blockTtl = await client.pttl(blockKey);
        return {
          totalHits: parseInt(currentHits?.toString() || '0'),
          timeToExpire: Math.ceil((await client.pttl(hitKey)) / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockTtl / 1000)
        };
      }

      const newHits = await client.incr(hitKey);

      // Set TTL if this is the first hit
      if (newHits === 1) {
        await client.pexpire(hitKey, ttlMs);
      }

      // Check if we need to block
      if (newHits > limit) {
        await client.set(blockKey, '1');
        await client.pexpire(blockKey, blockDurationMs);
        return {
          totalHits: newHits,
          timeToExpire: Math.ceil((await client.pttl(hitKey)) / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockDurationMs / 1000)
        };
      }

      return {
        totalHits: newHits,
        timeToExpire: Math.ceil((await client.pttl(hitKey)) / 1000),
        isBlocked: false,
        timeToBlockExpire: 0
      };
    } catch (error) {
      console.error('Redis error in increment:', error);
      // Fallback to allow request if Redis fails
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0
      };
    }
  }

  onModuleDestroy() {
    if (this.glide) {
      this.glide.close();
    }
  }

  private async getGlideClient(): Promise<GlideClient> {
    if (!this.glide) {
      const url = new URL(this.redisUrl);
      const options: GlideClientConfiguration = {
        addresses: [
          {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379
          }
        ],
        useTLS: this.useTLS
      };
      this.glide = await GlideClient.createClient(options);
    }
    return this.glide;
  }
}
