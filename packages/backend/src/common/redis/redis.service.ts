import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>(
      'redis.url',
      'redis://localhost:6379',
    );

    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.pubClient = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.subClient = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });

    this.subClient.on('message', (channel, message) => {
      this.logger.debug(`Message from channel ${channel}: ${message}`);
    });
  }

  // String operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    exSeconds?: number,
  ): Promise<void> {
    if (exSeconds) {
      await this.client.setex(key, exSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }

  async lrange(
    key: string,
    start: number,
    stop: number,
  ): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  // Sorted Set operations
  async zadd(
    key: string,
    score: number,
    member: string,
  ): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrangebyscore(
    key: string,
    min: number,
    max: number,
    limit?: number,
  ): Promise<string[]> {
    if (limit) {
      return this.client.zrangebyscore(key, min, max, 'LIMIT', 0, limit);
    }
    return this.client.zrangebyscore(key, min, max);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return this.pubClient.publish(channel, message);
  }

  async subscribe(channel: string): Promise<Redis> {
    await this.subClient.subscribe(channel);
    return this.subClient;
  }

  async unsubscribe(channel: string): Promise<number> {
    return (await this.subClient.unsubscribe(channel)) as number;
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  // Utility methods
  async getClient(): Promise<Redis> {
    return this.client;
  }

  async getPubClient(): Promise<Redis> {
    return this.pubClient;
  }

  async getSubClient(): Promise<Redis> {
    return this.subClient;
  }

  async flushAll(): Promise<void> {
    await this.client.flushall();
  }

  async shutdown(): Promise<void> {
    await this.client.quit();
    await this.pubClient.quit();
    await this.subClient.quit();
  }
}
