import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface SelfTestResponse {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  results: TestResult[];
}

@Injectable()
export class SelfTestService {
  private readonly logger = new Logger(SelfTestService.name);

  constructor(
    private prismaService: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async runSelfTest(tenantId: string): Promise<SelfTestResponse> {
    const results: TestResult[] = [];

    // Test 1: Database connectivity
    results.push(await this.testDatabase());

    // Test 2: Redis connectivity
    results.push(await this.testRedis());

    // Test 3: Tenant exists
    results.push(await this.testTenantExists(tenantId));

    // Test 4: JWT generation
    results.push(await this.testJwtGeneration());

    // Test 5: Channels exist
    results.push(await this.testChannelsExist(tenantId));

    // Test 6: Webhook URL reachability (if configured)
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant?.webhookUrl) {
      results.push(await this.testWebhookUrl(tenant.webhookUrl));
    }

    // Determine overall status
    const allPassed = results.every((r) => r.passed);
    const anyFailed = results.some((r) => !r.passed);

    const status = allPassed
      ? 'healthy'
      : anyFailed
        ? 'unhealthy'
        : 'degraded';

    return {
      timestamp: new Date().toISOString(),
      status,
      results,
    };
  }

  private async testDatabase(): Promise<TestResult> {
    try {
      await this.prismaService.tenant.count();
      return {
        name: 'Database Connection',
        passed: true,
        message: 'Database is accessible',
      };
    } catch (error) {
      this.logger.error('Database test failed:', error);
      return {
        name: 'Database Connection',
        passed: false,
        message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async testRedis(): Promise<TestResult> {
    try {
      const testKey = `test:${Date.now()}`;
      await this.redisService.set(testKey, 'test', 10);
      const value = await this.redisService.get(testKey);

      if (value === 'test') {
        await this.redisService.del(testKey);
        return {
          name: 'Redis Connection',
          passed: true,
          message: 'Redis is accessible',
        };
      } else {
        throw new Error('Redis value mismatch');
      }
    } catch (error) {
      this.logger.error('Redis test failed:', error);
      return {
        name: 'Redis Connection',
        passed: false,
        message: `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async testTenantExists(tenantId: string): Promise<TestResult> {
    try {
      const tenant = await this.prismaService.tenant.findUnique({
        where: { id: tenantId },
      });

      if (tenant) {
        return {
          name: 'Tenant Exists',
          passed: true,
          message: `Tenant found: ${tenant.name}`,
        };
      } else {
        return {
          name: 'Tenant Exists',
          passed: false,
          message: 'Tenant not found',
        };
      }
    } catch (error) {
      this.logger.error('Tenant test failed:', error);
      return {
        name: 'Tenant Exists',
        passed: false,
        message: `Tenant test failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async testJwtGeneration(): Promise<TestResult> {
    try {
      const token = this.jwtService.sign(
        { id: 'test', email: 'test@test.com' },
        {
          secret: this.configService.get<string>(
            'jwt.secret',
            'test-secret',
          ),
          expiresIn: '1h',
        },
      );

      if (token && typeof token === 'string') {
        return {
          name: 'JWT Generation',
          passed: true,
          message: 'JWT generation is working',
        };
      } else {
        return {
          name: 'JWT Generation',
          passed: false,
          message: 'JWT generation produced invalid token',
        };
      }
    } catch (error) {
      this.logger.error('JWT test failed:', error);
      return {
        name: 'JWT Generation',
        passed: false,
        message: `JWT generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async testChannelsExist(tenantId: string): Promise<TestResult> {
    try {
      const channels = await this.prismaService.channel.findMany({
        where: { tenantId },
      });

      if (channels.length > 0) {
        return {
          name: 'Channels Configured',
          passed: true,
          message: `${channels.length} channels found`,
        };
      } else {
        return {
          name: 'Channels Configured',
          passed: false,
          message: 'No channels configured',
        };
      }
    } catch (error) {
      this.logger.error('Channels test failed:', error);
      return {
        name: 'Channels Configured',
        passed: false,
        message: `Channels test failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async testWebhookUrl(webhookUrl: string): Promise<TestResult> {
    try {
      const response = await axios.head(webhookUrl, {
        timeout: 5000,
      });

      if (response.status < 400) {
        return {
          name: 'Webhook URL Reachable',
          passed: true,
          message: `Webhook URL is reachable (${response.status})`,
        };
      } else {
        return {
          name: 'Webhook URL Reachable',
          passed: false,
          message: `Webhook URL returned status ${response.status}`,
        };
      }
    } catch (error) {
      this.logger.warn('Webhook test failed:', error);
      return {
        name: 'Webhook URL Reachable',
        passed: false,
        message: `Webhook URL not reachable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
