import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CheckInDto, MakeupCheckInDto, QueryCheckInDto } from './dto/check-in.dto';

@Controller('check-in')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  /**
   * 签到（扣课时）
   * POST /api/check-in
   */
  @Post()
  async checkIn(@Body() dto: CheckInDto) {
    return this.checkInService.checkIn(dto);
  }

  /**
   * 补卡
   * POST /api/check-in/makeup
   */
  @Post('makeup')
  async makeupCheckIn(@Body() dto: MakeupCheckInDto) {
    return this.checkInService.makeupCheckIn(dto);
  }

  /**
   * 查询签到记录
   * GET /api/check-in
   */
  @Get()
  async findCheckInRecords(@Query() query: QueryCheckInDto) {
    return this.checkInService.findCheckInRecords(query);
  }

  /**
   * 查询订单的签到状态
   * GET /api/check-in/order/:orderId
   */
  @Get('order/:orderId')
  async getOrderCheckInStatus(@Param('orderId') orderId: string) {
    return this.checkInService.getOrderCheckInStatus(orderId);
  }

  /**
   * 批量查询预约的签到状态
   * GET /api/check-in/booking-status?bookingIds=id1,id2,id3
   */
  @Get('booking-status')
  async getBookingCheckInStatus(@Query('bookingIds') bookingIds: string) {
    const ids = bookingIds ? bookingIds.split(',').filter(Boolean) : [];
    return this.checkInService.batchGetBookingCheckInStatus(ids);
  }
}
