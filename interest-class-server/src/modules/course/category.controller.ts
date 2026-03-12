import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * 创建类目
   */
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    const id = await this.categoryService.create(dto);
    return { id };
  }

  /**
   * 初始化默认类目
   */
  @Post('init')
  async initDefaultCategories() {
    await this.categoryService.initDefaultCategories();
    return { message: '初始化成功' };
  }

  /**
   * 获取所有类目（扁平列表）
   */
  @Get()
  async findAll(@Query('tree') tree?: string) {
    if (tree === 'true') {
      return this.categoryService.findTree();
    }
    return this.categoryService.findAll();
  }

  /**
   * 获取一级类目
   */
  @Get('top')
  async findTopLevel() {
    return this.categoryService.findTopLevel();
  }

  /**
   * 获取子类目
   */
  @Get(':parentId/children')
  async findChildren(@Param('parentId') parentId: string) {
    return this.categoryService.findChildren(parentId);
  }

  /**
   * 根据ID查询
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  /**
   * 删除类目
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.categoryService.remove(id);
    return { message: '删除成功' };
  }
}
