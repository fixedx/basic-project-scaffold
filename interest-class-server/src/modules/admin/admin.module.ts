import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InstitutionModule } from '@/modules/institution/institution.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CourseModule } from '@/modules/course/course.module';
import { OrderModule } from '@/modules/order/order.module';
import { BookingModule } from '@/modules/booking/booking.module';
import { UserContextService } from '@/common/services/user-context.service';
import { PlatformConfigEntity } from './entities/platform-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformConfigEntity]),
    InstitutionModule,
    AuthModule,
    CourseModule,
    OrderModule,
    BookingModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, UserContextService],
  exports: [AdminService],
})
export class AdminModule {}
