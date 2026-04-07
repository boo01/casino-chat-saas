import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const { email, password } = loginDto;

    const admin = await this.prismaService.tenantAdmin.findFirst({
      where: { email, isActive: true },
    });

    if (!admin) {
      this.logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for admin: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const expiresIn = this.configService.get<string>('jwt.expiresIn', '24h');

    const token = this.jwtService.sign(
      {
        id: admin.id,
        tenantId: admin.tenantId,
        email: admin.email,
        role: admin.role,
      },
      {
        secret: this.configService.get<string>(
          'jwt.secret',
          'your-super-secret-key-change-in-production',
        ),
        expiresIn,
      },
    );

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: this.convertExpiresInToSeconds(expiresIn),
    };
  }

  async validateAdmin(adminId: string): Promise<boolean> {
    const admin = await this.prismaService.tenantAdmin.findUnique({
      where: { id: adminId },
    });

    return admin?.isActive || false;
  }

  private convertExpiresInToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // default 24h

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return 86400;
    }
  }
}
