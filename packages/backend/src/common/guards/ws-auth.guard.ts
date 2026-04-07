import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const socket = context.switchToWs().getClient<Socket>();
    const authHeader = socket.handshake.auth?.token;

    if (!authHeader) {
      // Allow guest connections (read-only)
      socket.data.isGuest = true;
      socket.data.player = null;
      return true;
    }

    try {
      const decoded = this.jwtService.verify(authHeader, {
        secret: this.configService.get<string>(
          'jwt.secret',
          'your-super-secret-key-change-in-production',
        ),
      });

      socket.data.player = decoded;
      socket.data.isGuest = false;
      return true;
    } catch (error) {
      this.logger.warn(`WebSocket JWT verification failed: ${error.message}`);
      // Allow guest connections
      socket.data.isGuest = true;
      socket.data.player = null;
      return true;
    }
  }
}
