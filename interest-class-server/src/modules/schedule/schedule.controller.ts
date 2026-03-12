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
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { BatchCreateScheduleDto } from './dto/batch-create-schedule.dto';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  async create(@Body() dto: CreateScheduleDto): Promise<string> {
    return this.scheduleService.create(dto);
  }

  @Post('batch')
  async batchCreate(@Body() dto: BatchCreateScheduleDto) {
    return this.scheduleService.batchCreate(dto);
  }

  @Get()
  async findAll(@Query() query: QueryScheduleDto) {
    return this.scheduleService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Get('course/:courseId')
  async findByCourse(@Param('courseId') courseId: string) {
    return this.scheduleService.findByCourse(courseId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleDto): Promise<boolean> {
    await this.scheduleService.update(id, dto);
    return true;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<boolean> {
    await this.scheduleService.remove(id);
    return true;
  }
}
