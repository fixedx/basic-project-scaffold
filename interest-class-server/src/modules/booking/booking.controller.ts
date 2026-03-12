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
import { BookingService } from './booking.service';
import { CreateBookingDto, UpdateBookingStatusDto, ChangeBookingScheduleDto } from './dto/booking.dto';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * 创建预约
   */
  @Post()
  async create(@Body() dto: CreateBookingDto): Promise<string> {
    return this.bookingService.create(dto);
  }

  /**
   * 查询我的预约列表
   */
  @Get('my')
  async findMyBookings(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
  ) {
    return this.bookingService.findMyBookings(
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
      status,
    );
  }

  /**
   * 查询机构预约列表
   */
  @Get('institution/:institutionId')
  async findInstitutionBookings(
    @Param('institutionId') institutionId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
  ) {
    return this.bookingService.findInstitutionBookings(
      institutionId,
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
      status,
    );
  }

  /**
   * 查询课程预约列表
   */
  @Get('course/:courseId')
  async findCourseBookings(
    @Param('courseId') courseId: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.bookingService.findCourseBookings(courseId, +page, +pageSize);
  }

  /**
   * 查询预约详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  /**
   * 更新预约状态（机构端）
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<boolean> {
    await this.bookingService.updateStatus(id, dto);
    return true;
  }

  /**
   * 确认预约（机构端）- 快捷方式
   */
  @Put(':id/confirm')
  async confirm(@Param('id') id: string, @Body() body?: any): Promise<boolean> {
    await this.bookingService.updateStatus(id, {
      status: 'confirmed',
      reason: body?.reason,
    });
    return true;
  }

  /**
   * 取消预约（用户端）
   */
  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body?: any): Promise<boolean> {
    await this.bookingService.cancel(id, body?.reason || body?.cancel_reason);
    return true;
  }

  /**
   * 审核取消预约（机构端）
   * @param id 预约ID
   * @param action approve-同意取消, reject-拒绝取消
   */
  @Put(':id/review-cancel')
  async reviewCancel(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ): Promise<boolean> {
    await this.bookingService.reviewCancel(id, body.action, body.reason);
    return true;
  }

  /**
   * 修改预约排课（用户端）
   * 如果距离上课时间不足24小时，需要机构审核
   */
  @Put(':id/change-schedule')
  async changeSchedule(
    @Param('id') id: string,
    @Body() dto: ChangeBookingScheduleDto,
  ): Promise<{ success: boolean; needsApproval: boolean }> {
    const result = await this.bookingService.changeSchedule(
      id,
      dto.new_schedule_id,
    );
    return { success: true, ...result };
  }

  /**
   * 审核修改预约请求（机构端）
   * @param id 预约ID
   * @param action approve-同意, reject-拒绝
   */
  @Put(':id/review-change')
  async reviewChangeSchedule(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ): Promise<boolean> {
    await this.bookingService.reviewChangeSchedule(id, body.action, body.reason);
    return true;
  }

  /**
   * 删除预约
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.bookingService.remove(id);
    return { message: '删除成功' };
  }
}
