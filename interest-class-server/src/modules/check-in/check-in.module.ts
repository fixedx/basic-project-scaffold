import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckInEntity } from './entities/check-in.entity';
import { CheckInRepository } from './repositories/check-in.repository';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';
import { CommonModule } from '@/modules/common/common.module';
import { InviteModule } from '@/modules/invite/invite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckInEntity]),
    CommonModule,
    forwardRef(() => InviteModule),
  ],
  controllers: [CheckInController],
  providers: [CheckInService, CheckInRepository],
  exports: [CheckInService, CheckInRepository],
})
export class CheckInModule {}
