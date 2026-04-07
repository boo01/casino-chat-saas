import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

describe('TenantService', () => {
  let service: TenantService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Casino',
    domain: 'test.casino',
    apiKey: 'test-key',
    apiSecretHash: 'test-hash',
    tier: 'BASIC',
    isActive: true,
    webhookUrl: null,
    allowedIps: [],
    branding: {},
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    prismaService = module.get(PrismaService);
  });

  describe('createTenant', () => {
    it('should create a new tenant with admin', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.tenant.create as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.createTenant({
        name: 'Test Casino',
        domain: 'test.casino',
        adminEmail: 'admin@test.casino',
        adminPassword: 'password123',
      });

      expect(result.name).toBe('Test Casino');
      expect(result.domain).toBe('test.casino');
      expect(prismaService.tenant.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if domain exists', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      await expect(
        service.createTenant({
          name: 'Duplicate',
          domain: 'test.casino',
          adminEmail: 'admin@dup.casino',
          adminPassword: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getTenant', () => {
    it('should return tenant by id', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.getTenant('tenant-1');

      expect(result.id).toBe('tenant-1');
    });

    it('should throw NotFoundException for missing tenant', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getTenant('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listTenants', () => {
    it('should return all tenants', async () => {
      (prismaService.tenant.findMany as jest.Mock).mockResolvedValue([mockTenant]);

      const result = await service.listTenants();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Casino');
    });
  });

  describe('updateTenant', () => {
    it('should update tenant fields', async () => {
      const updated = { ...mockTenant, name: 'Updated Casino' };
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prismaService.tenant.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateTenant('tenant-1', { name: 'Updated Casino' });

      expect(result.name).toBe('Updated Casino');
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateTenant('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTenant', () => {
    it('should delete existing tenant', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      await service.deleteTenant('tenant-1');

      expect(prismaService.tenant.delete).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
      });
    });

    it('should throw NotFoundException for missing tenant', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteTenant('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('regenerateApiKey', () => {
    it('should generate new API key and secret', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prismaService.tenant.update as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.regenerateApiKey('tenant-1');

      expect(result.apiKey).toBeDefined();
      expect(result.apiSecret).toBeDefined();
      expect(prismaService.tenant.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing tenant', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.regenerateApiKey('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
