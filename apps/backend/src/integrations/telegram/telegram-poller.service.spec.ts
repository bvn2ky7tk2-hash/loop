import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { TelegramPollerService } from './telegram-poller.service';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../../prisma/prisma.service';

// cls.run chạy callback ngay (mô phỏng hành vi thật: bọc tenant context rồi gọi cb).
const mockClsService = {
  run: jest.fn((cb: () => unknown) => cb()),
  set: jest.fn(),
  get: jest.fn(),
  isActive: jest.fn().mockReturnValue(true),
};

const mockTelegramService = {
  getIsEnabled: jest.fn().mockReturnValue(false),
  getUpdates: jest.fn().mockResolvedValue([]),
  answerCallbackQuery: jest.fn().mockResolvedValue(undefined),
  editMessageText: jest.fn().mockResolvedValue(undefined),
};

const mockPrismaService = {
  task: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  telegramMessage: {
    findFirst: jest.fn(),
  },
  telegramConfig: {
    findUnique: jest.fn(),
  },
};

describe('TelegramPollerService', () => {
  let service: TelegramPollerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramPollerService,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClsService, useValue: mockClsService },
      ],
    }).compile();

    service = module.get<TelegramPollerService>(TelegramPollerService);
  });

  describe('parseCallbackData', () => {
    it('should parse valid callback data correctly', () => {
      const result = service.parseCallbackData('task:done:abc123');
      expect(result).toEqual({ action: 'done', taskId: 'abc123' });
    });

    it('should parse inprogress action', () => {
      const result = service.parseCallbackData('task:inprogress:xyz-456');
      expect(result).toEqual({ action: 'inprogress', taskId: 'xyz-456' });
    });

    it('should parse return action', () => {
      const result = service.parseCallbackData('task:return:abc123');
      expect(result).toEqual({ action: 'return', taskId: 'abc123' });
    });

    it('should return null for invalid format', () => {
      expect(service.parseCallbackData('invalid:data')).toBeNull();
    });

    it('should return null for unknown action', () => {
      expect(service.parseCallbackData('task:unknown:abc123')).toBeNull();
    });

    it('should return null for wrong prefix', () => {
      expect(service.parseCallbackData('other:done:abc123')).toBeNull();
    });

    it('should return null when taskId is empty', () => {
      expect(service.parseCallbackData('task:done:')).toBeNull();
    });
  });

  describe('handleCallbackQuery (via onModuleInit not called — test private via cast)', () => {
    it('should answer with error when task not found', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      // Access private method for testing
      const pollerAny = service as unknown as {
        handleCallbackQuery: (query: {
          id: string;
          data: string;
        }) => Promise<void>;
      };

      await pollerAny.handleCallbackQuery({ id: 'cbq-1', data: 'task:done:nonexistent' });

      expect(mockTelegramService.answerCallbackQuery).toHaveBeenCalledWith(
        'cbq-1',
        '❌ Không tìm thấy task này',
      );
      expect(mockPrismaService.task.update).not.toHaveBeenCalled();
    });

    it('should reject DONE task with info message', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'DONE',
        title: 'Some task',
        tenantId: 'tenant-1',
      });

      const pollerAny = service as unknown as {
        handleCallbackQuery: (query: {
          id: string;
          data: string;
        }) => Promise<void>;
      };

      await pollerAny.handleCallbackQuery({ id: 'cbq-2', data: 'task:done:task-1' });

      expect(mockTelegramService.answerCallbackQuery).toHaveBeenCalledWith(
        'cbq-2',
        expect.stringContaining('Hoàn thành'),
      );
      expect(mockPrismaService.task.update).not.toHaveBeenCalled();
    });

    it('should update task status on valid callback', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        title: 'Some task',
        tenantId: 'tenant-1',
      });
      mockPrismaService.task.update.mockResolvedValue({ id: 'task-1', status: 'DONE' });
      mockPrismaService.telegramMessage.findFirst.mockResolvedValue(null);

      const pollerAny = service as unknown as {
        handleCallbackQuery: (query: {
          id: string;
          data: string;
        }) => Promise<void>;
      };

      await pollerAny.handleCallbackQuery({ id: 'cbq-3', data: 'task:done:task-1' });

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({ status: 'DONE', progress: 100 }),
        }),
      );
      expect(mockTelegramService.answerCallbackQuery).toHaveBeenCalledWith(
        'cbq-3',
        expect.stringContaining('Hoàn thành'),
      );
    });
  });
});
