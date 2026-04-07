import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = this.configService.get<string>(
      'admin.apiKeyHeader',
      'X-Api-Key',
    );
    const timestampHeader = this.configService.get<string>(
      'admin.timestampHeader',
      'X-Timestamp',
    );
    const signatureHeader = this.configService.get<string>(
      'admin.signatureHeader',
      'X-Signature',
    );

    const apiKey = request.headers[apiKeyHeader.toLowerCase()];
    const timestamp = request.headers[timestampHeader.toLowerCase()];
    const signature = request.headers[signatureHeader.toLowerCase()];

    if (!apiKey || !timestamp || !signature) {
      this.logger.warn('Missing required headers for API key authentication');
      throw new UnauthorizedException('Missing required authentication headers');
    }

    // Check timestamp validity (within 5 minutes)
    const requestTimestamp = parseInt(timestamp, 10);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTimestamp);

    if (timeDiff > 5 * 60 * 1000) {
      this.logger.warn('Request timestamp is outside acceptable window');
      throw new UnauthorizedException('Request timestamp is invalid');
    }

    // Find tenant by API key
    const tenant = await this.prismaService.tenant.findUnique({
      where: { apiKey },
    });

    if (!tenant) {
      this.logger.warn(`Invalid API key: ${apiKey}`);
      throw new UnauthorizedException('Invalid API key');
    }

    if (!tenant.isActive) {
      this.logger.warn(`Tenant is inactive: ${tenant.id}`);
      throw new UnauthorizedException('Tenant is not active');
    }

    // Verify signature
    const requestPath = request.url;
    const requestMethod = request.method;
    const body = request.body ? JSON.stringify(request.body) : '';

    const signatureData = `${requestMethod}${requestPath}${timestamp}${body}`;
    const expectedSignature = createHmac('sha256', tenant.apiSecretHash)
      .update(signatureData)
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.warn(`Invalid signature for API key: ${apiKey}`);
      throw new UnauthorizedException('Invalid request signature');
    }

    // Attach tenant to request
    request.tenant = tenant;
    return true;
  }
}
