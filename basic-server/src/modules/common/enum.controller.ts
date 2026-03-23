import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { EnumService } from './enum.service';
import { CreateEnumDto } from './dto/create-enum.dto';

@Controller('enums')
export class EnumController {
  constructor(private readonly enumService: EnumService) {}

  /**
   * 创建枚举
   */
  @Post()
  async create(@Body() dto: CreateEnumDto) {
    const id = await this.enumService.create(dto);
    return { id };
  }

  /**
   * 获取所有枚举（按类型分组）
   */
  @Get()
  async getAll(@Query('types') types?: string) {
    if (types) {
      const typeArray = types.split(',');
      return this.enumService.getByTypes(typeArray);
    }
    return this.enumService.getAll();
  }

  /**
   * 获取指定类型的枚举
   */
  @Get(':type')
  async getByType(@Param('type') type: string) {
    return this.enumService.getByType(type);
  }

  /**
   * 初始化默认枚举数据
   */
  @Post('init')
  async initDefaultEnums() {
    await this.enumService.initDefaultEnums();
    return { message: '初始化成功' };
  }

  /**
   * 删除枚举
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.enumService.remove(id);
    return { message: '删除成功' };
  }
}
