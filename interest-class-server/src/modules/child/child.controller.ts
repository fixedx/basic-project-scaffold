import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ChildService } from './child.service';
import { CreateChildDto, UpdateChildDto } from './dto/child.dto';

@Controller('child')
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  /**
   * 创建宝贝
   */
  @Post()
  async create(@Body() dto: CreateChildDto): Promise<string> {
    return this.childService.create(dto);
  }

  /**
   * 查询我的宝贝列表
   */
  @Get('my')
  async findMyChildren() {
    return this.childService.findMyChildren();
  }

  /**
   * 查询宝贝详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.childService.findOne(id);
  }

  /**
   * 更新宝贝
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ): Promise<boolean> {
    return this.childService.update(id, dto);
  }

  /**
   * 删除宝贝
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return this.childService.remove(id);
  }

  /**
   * 批量更新排序
   */
  @Post('sort')
  async updateSort(@Body() body: { ids: string[] }): Promise<boolean> {
    return this.childService.updateSort(body.ids);
  }
}
