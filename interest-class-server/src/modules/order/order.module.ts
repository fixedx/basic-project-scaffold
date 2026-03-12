import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderTasksService } from './order-tasks.service';
import { OrderEntity } from './entities/order.entity';
import { OrderRepository } from './repositories/order.repository';
import { CourseModule } from '../course/course.module';
import { InstitutionModule } from '../institution/institution.module';
import { BookingModule } from '../booking/booking.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { CommonModule } from '../common/common.module';
import { PaymentModule } from '../payment/payment.module';
import { InviteModule } from '../invite/invite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    forwardRef(() => CourseModule),
    forwardRef(() => InstitutionModule),
    forwardRef(() => BookingModule),
    forwardRef(() => ScheduleModule),
    CommonModule,
    forwardRef(() => PaymentModule),
    forwardRef(() => InviteModule),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, OrderTasksService],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
