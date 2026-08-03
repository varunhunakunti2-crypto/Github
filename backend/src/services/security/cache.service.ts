import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private memoryFallback: Map<string, { value: string; expiresAt: number }> = new Map();

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        showFriendlyErrorStack: true,
        lazyConnect: true
      });
      
      this.redis.on("error", (err) => {
        console.warn("[CACHE] Redis connection unavailable, falling back to Memory cache:", err.message);
        this.redis = null; // Fail-over to memory
      });
    } catch (e) {
      console.warn("[CACHE] Failed to instantiate Redis client:", e);
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val) return JSON.parse(val) as T;
      } catch (err) {
        // Fail-over to memory fallback
      }
    }

    const cached = this.memoryFallback.get(key);
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        return JSON.parse(cached.value) as T;
      }
      this.memoryFallback.delete(key);
    }
    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const strVal = JSON.stringify(value);

    if (this.redis) {
      try {
        await this.redis.set(key, strVal, "EX", ttlSeconds);
        return;
      } catch (err) {
        // Fallback to memory
      }
    }

    this.memoryFallback.set(key, {
      value: strVal,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        // Fallback
      }
    }
    this.memoryFallback.delete(key);
  }

  // ── Invalidation Strategies ──────────────────────────────────────────

  async invalidateRepoCache(owner: string, repo: string) {
    const prefix = `repo:${owner}:${repo}:`;
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      } catch (err) {
        // Fallback
      }
    }

    // Memory fallback invalidation
    for (const key of this.memoryFallback.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryFallback.delete(key);
      }
    }
  }

  async invalidateUserPermissions(userId: string) {
    const key = `perms:user:${userId}`;
    await this.del(key);
  }
}
