import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { QueryClassroomDto } from './dto/query-classroom.dto';

@Controller('classroom')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  async create(@Body() createDto: CreateClassroomDto): Promise<string> {
    return this.classroomService.create(createDto);
  }

  @Get()
  async findAll(@Query() query: QueryClassroomDto) {
    return this.classroomService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.classroomService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateClassroomDto,
  ): Promise<boolean> {
    await this.classroomService.update(id, updateDto);
    return true;
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<boolean> {
    await this.classroomService.delete(id);
    return true;
  }

  @Post('sort')
  async updateSort(@Body() items: Array<{ id: string; sort_order: number }>) {
    await this.classroomService.updateSort(items);
    return { message: '排序更新成功' };
  }
}
