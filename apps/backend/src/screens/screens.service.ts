import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScreensService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.screen.findMany({
      where: { isActive: true },
      orderBy: [{ module: 'asc' }, { sortOrder: 'asc' }],
    });
  }
}
