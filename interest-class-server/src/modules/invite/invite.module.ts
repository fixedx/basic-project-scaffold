import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '@/modules/common/common.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { InviteTasksService } from './invite-tasks.service';
import {
  UserInviteCodeEntity,
  InviteOrderEntity,
  UserBalanceEntity,
  CashbackRecordEntity,
  WithdrawRecordEntity,
} from './entities';
import {
  UserInviteCodeRepository,
  InviteOrderRepository,
  UserBalanceRepository,
  CashbackRecordRepository,
  WithdrawRecordRepository,
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserInviteCodeEntity,
      InviteOrderEntity,
      UserBalanceEntity,
      CashbackRecordEntity,
      WithdrawRecordEntity,
    ]),
    CommonModule,
    forwardRef(() => AuthModule),
    forwardRef(() => PaymentModule),
    NotificationModule,
  ],
  controllers: [InviteController],
  providers: [
    InviteService,
    InviteTasksService,
    UserInviteCodeRepository,
    InviteOrderRepository,
    UserBalanceRepository,
    CashbackRecordRepository,
    WithdrawRecordRepository,
  ],
  exports: [
    InviteService,
    UserInviteCodeRepository,
    InviteOrderRepository,
    UserBalanceRepository,
    CashbackRecordRepository,
    WithdrawRecordRepository,
  ],
})
export class InviteModule {}
