import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { OrderModule } from '../order/order.module';
import { AuthModule } from '../auth/auth.module';
import { BookingModule } from '../booking/booking.module';
import { InviteModule } from '../invite/invite.module';
import { CommonModule } from '@/modules/common/common.module';
import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [
    CommonModule,
    forwardRef(() => OrderModule),
    forwardRef(() => AuthModule),
    forwardRef(() => BookingModule),
    forwardRef(() => InviteModule),
    NotificationModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
