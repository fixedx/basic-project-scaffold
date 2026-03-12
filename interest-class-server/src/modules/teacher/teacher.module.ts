import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { TeacherEntity } from './entities/teacher.entity';
import { TeacherUserEntity } from './entities/teacher-user.entity';
import { TeacherRepository } from './repositories/teacher.repository';
import { TeacherUserRepository } from './repositories/teacher-user.repository';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserContextService } from '@/common/services/user-context.service';
import { ScheduleModule } from '@/modules/schedule/schedule.module';
import { BookingModule } from '@/modules/booking/booking.module';
import { CourseModule } from '@/modules/course/course.module';
import { CheckInModule } from '@/modules/check-in/check-in.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherEntity, TeacherUserEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => ScheduleModule),
    forwardRef(() => CourseModule),
    forwardRef(() => BookingModule),
    forwardRef(() => CheckInModule),
  ],
  controllers: [TeacherController],
  providers: [
    TeacherService,
    TeacherRepository,
    TeacherUserRepository,
    UserContextService,
  ],
  exports: [TeacherService, TeacherRepository, TeacherUserRepository],
})
export class TeacherModule {}
