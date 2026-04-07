import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockAdmin = {
    id: 'admin-1',
    email: 'super@test.com',
    passwordHash: 'hashed',
    name: 'Super Admin',
    role: 'SUPER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        {
          provide: PrismaService,
          useValue: {
            superAdmin: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            tenant: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn().mockResolvedValue(2),
            },
            player: { count: jest.fn().mockResolvedValue(25) },
            message: { count: jest.fn().mockResolvedValue(100) },
            channel: { count: jest.fn().mockResolvedValue(5) },
            tenantAdmin: { count: jest.fn().mockResolvedValue(3) },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = module.get(SuperAdminService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return token on valid credentials', async () => {
      (prismaService.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'super@test.com', password: 'pass' });

      expect(result.accessToken).toBe('mock-token');
      expect(result.tokenType).toBe('Bearer');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ isSuperAdmin: true }),
        expect.any(Object),
      );
    });

    it('should throw on invalid email', async () => {
      (prismaService.superAdmin.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on wrong password', async () => {
      (prismaService.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'super@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('create', () => {
    it('should create a new super admin', async () => {
      (prismaService.superAdmin.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.superAdmin.create as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.create({
        email: 'new@test.com',
        password: 'pass',
        name: 'New Admin',
      });

      expect(result.email).toBe('super@test.com');
    });

    it('should throw if email exists', async () => {
      (prismaService.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

      await expect(
        service.create({ email: 'super@test.com', password: 'pass', name: 'Dup' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getDashboardStats', () => {
    it('should return platform-wide stats', async () => {
      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('tenants');
      expect(result).toHaveProperty('totalPlayers');
      expect(result).toHaveProperty('totalMessages');
    });
  });

  describe('findById', () => {
    it('should return admin by id', async () => {
      (prismaService.superAdmin.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

      const result = await service.findById('admin-1');
      expect(result.email).toBe('super@test.com');
    });

    it('should throw NotFoundException', async () => {
      (prismaService.superAdmin.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
