import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { TelegramService } from './telegram.service';
import { UpdateTelegramConfigDto } from './dto/update-telegram-config.dto';
import { PrismaService } from '../../prisma/prisma.service';

const SINGLETON_ID = 'singleton';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('api/v1/integrations/telegram')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy cấu hình Telegram hiện tại' })
  async getConfig() {
    const config = await this.prisma.telegramConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (!config) {
      return { isEnabled: false, botToken: null, chatId: null };
    }
    return {
      isEnabled: config.isEnabled,
      botToken: this.telegramService.maskToken(config.botToken),
      chatId: config.chatId,
    };
  }

  @Put()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cấu hình Telegram' })
  async updateConfig(@Body() dto: UpdateTelegramConfigDto) {
    const existing = await this.prisma.telegramConfig.findUnique({
      where: { id: SINGLETON_ID },
    });

    const data: {
      botToken?: string;
      chatId?: string;
      isEnabled?: boolean;
    } = {};

    if (dto.botToken !== undefined) data.botToken = dto.botToken;
    if (dto.chatId !== undefined) data.chatId = dto.chatId;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;

    let config;
    if (existing) {
      config = await this.prisma.telegramConfig.update({
        where: { id: SINGLETON_ID },
        data,
      });
    } else {
      config = await this.prisma.telegramConfig.create({
        data: {
          id: SINGLETON_ID,
          botToken: dto.botToken ?? '',
          chatId: dto.chatId ?? '',
          isEnabled: dto.isEnabled ?? false,
        },
      });
    }

    await this.telegramService.refreshConfig();

    return {
      isEnabled: config.isEnabled,
      botToken: this.telegramService.maskToken(config.botToken),
      chatId: config.chatId,
    };
  }

  @Post('test')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Gửi tin thử nghiệm Telegram' })
  async testConfig() {
    try {
      const config = await this.prisma.telegramConfig.findUnique({
        where: { id: SINGLETON_ID },
      });
      if (!config || !config.isEnabled || !config.botToken || !config.chatId) {
        return { success: false, error: 'Chưa cấu hình Telegram hoặc chưa bật tích hợp' };
      }

      const res = await fetch(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: '✅ *\\[LOOP\\]* Tin nhắn thử nghiệm — kết nối Telegram thành công\\!',
            parse_mode: 'MarkdownV2',
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `Telegram API error ${res.status}: ${body}` };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }
}
