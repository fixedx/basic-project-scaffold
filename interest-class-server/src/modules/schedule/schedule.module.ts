import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleRepository } from './repositories/schedule.repository';
import { ScheduleEntity } from './entities/schedule.entity';
import { AuthModule } from '@/modules/auth/auth.module';
import { CommonModule } from '@/modules/common/common.module';
import { CourseModule } from '@/modules/course/course.module';
import { TeacherModule } from '@/modules/teacher/teacher.module';
import { ClassroomModule } from '@/modules/classroom/classroom.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleEntity]),
    forwardRef(() => AuthModule),  // forwardRef: AuthModule → TeacherModule → ScheduleModule 循环
    CommonModule,
    forwardRef(() => CourseModule),  // forwardRef: 避免循环依赖
    forwardRef(() => TeacherModule),  // forwardRef: TeacherModule ↔ ScheduleModule 循环
    ClassroomModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleRepository],
  exports: [ScheduleService, ScheduleRepository],
})
export class ScheduleModule {}
