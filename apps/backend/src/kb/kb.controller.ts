import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, Req, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KbService } from './kb.service';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateArticleDto, UpdateArticleDto,
} from './dto/kb.dto';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@Controller('api/v1/kb')
export class KbController {
  constructor(private readonly svc: KbService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê KB' })
  stats() { return this.svc.stats(); }

  // ─── Categories ──────────────────────────────────────────
  @Get('categories')
  listCategories() { return this.svc.listCategories(); }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) { return this.svc.createCategory(dto); }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) { return this.svc.deleteCategory(id); }

  // ─── Articles ────────────────────────────────────────────
  @Get('articles')
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status',     required: false })
  @ApiQuery({ name: 'search',     required: false })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  @ApiQuery({ name: 'limit',      required: false, type: Number })
  listArticles(
    @Query('categoryId') categoryId?: string,
    @Query('status')     status?: string,
    @Query('search')     search?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.svc.listArticles({ categoryId, status, search, page, limit });
  }

  @Get('articles/:id')
  getArticle(@Param('id') id: string) { return this.svc.getArticle(id); }

  @Post('articles')
  createArticle(@Body() dto: CreateArticleDto, @Req() req: any) {
    const authorId = req.user?.sub ?? req.user?.id;
    return this.svc.createArticle(dto, authorId);
  }

  @Put('articles/:id')
  updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.svc.updateArticle(id, dto);
  }

  @Delete('articles/:id')
  deleteArticle(@Param('id') id: string) { return this.svc.deleteArticle(id); }
}
