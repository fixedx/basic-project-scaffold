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
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  /**
   * 获取教师考勤 - 按课程维度汇总
   * GET /api/teacher/my-attendance-courses
   */
  @Get('my-attendance-courses')
  async getMyAttendanceCourses() {
    return this.teacherService.getMyAttendanceCourses();
  }

  /**
   * 获取某课程的考勤详情（学员签到记录）
   * GET /api/teacher/course-attendance/:courseId
   */
  @Get('course-attendance/:courseId')
  async getCourseAttendance(@Param('courseId') courseId: string) {
    return this.teacherService.getCourseAttendance(courseId);
  }

  /**
   * 获取当前教师的授课课程列表
   * 需要登录（JWT 中包含 teacherId）
   */
  @Get('my-courses')
  async getMyCourses() {
    return this.teacherService.getMyCourses();
  }

  /**
   * 获取当前教师的学员列表
   * 需要登录（JWT 中包含 teacherId）
   */
  @Get('my-students')
  async getMyStudents() {
    return this.teacherService.getMyStudents();
  }

  @Post()
  async create(@Body() createDto: CreateTeacherDto): Promise<string> {
    return this.teacherService.create(createDto);
  }

  @Get()
  async findAll(@Query() query: QueryTeacherDto) {
    return this.teacherService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.teacherService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTeacherDto,
  ): Promise<boolean> {
    await this.teacherService.update(id, updateDto);
    return true;
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<boolean> {
    await this.teacherService.delete(id);
    return true;
  }

  @Post('sort')
  async updateSort(@Body() items: Array<{ id: string; sort_order: number }>) {
    await this.teacherService.updateSort(items);
    return { message: '排序更新成功' };
  }
}
