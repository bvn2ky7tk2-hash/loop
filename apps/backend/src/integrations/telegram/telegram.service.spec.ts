import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  telegramConfig: {
    findUnique: jest.fn(),
  },
};

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  describe('onModuleInit / refreshConfig', () => {
    it('should load config on init', async () => {
      mockPrismaService.telegramConfig.findUnique.mockResolvedValue({
        id: 'singleton',
        botToken: 'testtoken123',
        chatId: '-100123456',
        isEnabled: true,
      });

      await service.onModuleInit();

      expect(service.getIsEnabled()).toBe(true);
    });

    it('should set isEnabled false when no config', async () => {
      mockPrismaService.telegramConfig.findUnique.mockResolvedValue(null);

      await service.onModuleInit();

      expect(service.getIsEnabled()).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should return early when isEnabled is false', async () => {
      mockPrismaService.telegramConfig.findUnique.mockResolvedValue(null);
      await service.onModuleInit();

      await service.sendMessage('test message');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call fetch with correct URL when enabled', async () => {
      mockPrismaService.telegramConfig.findUnique.mockResolvedValue({
        id: 'singleton',
        botToken: 'myBotToken123',
        chatId: '-100123456',
        isEnabled: true,
      });
      await service.onModuleInit();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
        text: async () => 'OK',
      });

      await service.sendMessage('Hello World');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botmyBotToken123/sendMessage',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should not throw when fetch fails', async () => {
      mockPrismaService.telegramConfig.findUnique.mockResolvedValue({
        id: 'singleton',
        botToken: 'myBotToken123',
        chatId: '-100123456',
        isEnabled: true,
      });
      await service.onModuleInit();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.sendMessage('test')).resolves.toBeUndefined();
    });
  });

  describe('maskToken', () => {
    it('should return 8 chars + ***', () => {
      const result = service.maskToken('12345678abcdef');
      expect(result).toBe('12345678***');
    });

    it('should handle short tokens', () => {
      const result = service.maskToken('1234');
      expect(result).toBe('1234***');
    });
  });
});
