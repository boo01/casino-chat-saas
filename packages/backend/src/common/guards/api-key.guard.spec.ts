import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ApiKeyGuard } from './api-key.guard';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenant = {
    id: 'tenant-1',
    apiKey: 'test-api-key',
    apiSecretHash: 'test-secret-hash',
    isActive: true,
  };

  function createMockContext(headers: Record<string, string>, method = 'POST', url = '/webhooks/casino', body?: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          method,
          url,
          body,
        }),
      }),
    } as any;
  }

  function generateSignature(secretHash: string, method: string, path: string, timestamp: string, body: string = ''): string {
    const data = `${method}${path}${timestamp}${body}`;
    return createHmac('sha256', secretHash).update(data).digest('hex');
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultVal: string) => defaultVal),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    prismaService = module.get(PrismaService);
  });

  it('should throw if required headers are missing', async () => {
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if timestamp is too old', async () => {
    const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString();
    const sig = generateSignature(mockTenant.apiSecretHash, 'POST', '/webhooks/casino', oldTimestamp);

    const context = createMockContext({
      'x-api-key': mockTenant.apiKey,
      'x-timestamp': oldTimestamp,
      'x-signature': sig,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if API key not found', async () => {
    const timestamp = Date.now().toString();
    const sig = generateSignature(mockTenant.apiSecretHash, 'POST', '/webhooks/casino', timestamp);

    (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

    const context = createMockContext({
      'x-api-key': 'invalid-key',
      'x-timestamp': timestamp,
      'x-signature': sig,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if tenant is inactive', async () => {
    const timestamp = Date.now().toString();
    const sig = generateSignature(mockTenant.apiSecretHash, 'POST', '/webhooks/casino', timestamp);

    (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
      ...mockTenant,
      isActive: false,
    });

    const context = createMockContext({
      'x-api-key': mockTenant.apiKey,
      'x-timestamp': timestamp,
      'x-signature': sig,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if signature is invalid', async () => {
    const timestamp = Date.now().toString();

    (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

    const context = createMockContext({
      'x-api-key': mockTenant.apiKey,
      'x-timestamp': timestamp,
      'x-signature': 'a'.repeat(64),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should pass with valid signature and attach tenant to request', async () => {
    const timestamp = Date.now().toString();
    const body = JSON.stringify({ event: 'test' });
    const sig = generateSignature(mockTenant.apiSecretHash, 'POST', '/webhooks/casino', timestamp, body);

    (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

    const request: any = {
      headers: {
        'x-api-key': mockTenant.apiKey,
        'x-timestamp': timestamp,
        'x-signature': sig,
      },
      method: 'POST',
      url: '/webhooks/casino',
      body: { event: 'test' },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.tenant).toEqual(mockTenant);
  });
});
