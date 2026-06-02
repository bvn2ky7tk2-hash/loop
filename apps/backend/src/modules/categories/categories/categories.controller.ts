import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách danh mục (filter theo type / parentId / search)' })
  findAll(
    @Query('type') type?: string,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(type, parentId, search);
  }

  @Get('types')
  @ApiOperation({ summary: 'Các loại danh mục đang có' })
  types() {
    return this.service.types();
  }

  @Post()
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Tạo mục danh mục' })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Cập nhật mục danh mục' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Xóa mục danh mục' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
