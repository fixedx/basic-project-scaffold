import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';
import { InstitutionRepository } from './repositories/institution.repository';
import { InstitutionHonorRepository } from './repositories/institution-honor.repository';
import { InstitutionShowcaseRepository } from './repositories/institution-showcase.repository';
import { InstitutionTeachingEnvRepository } from './repositories/institution-teaching-env.repository';
import { UserRepository } from '@/modules/auth/repositories/user.repository';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { InstitutionEntity } from './entities/institution.entity';
import { InstitutionHonorEntity } from './entities/institution-honor.entity';
import { InstitutionShowcaseEntity } from './entities/institution-showcase.entity';
import { InstitutionTeachingEnvEntity } from './entities/institution-teaching-env.entity';
import { UserEntity } from '@/modules/auth/entities/user.entity';
import { UserInstitutionEntity } from '@/modules/auth/entities/user-institution.entity';
import { UserContextService } from '@/common/services/user-context.service';
import { TeacherRepository } from '@/modules/teacher/repositories/teacher.repository';
import { TeacherEntity } from '@/modules/teacher/entities/teacher.entity';
import { CourseEntity } from '@/modules/course/entities/course.entity';
import { CourseSkuEntity } from '@/modules/course/entities/course-sku.entity';
import { CourseRepository } from '@/modules/course/repositories/course.repository';
import { CourseSkuRepository } from '@/modules/course/repositories/course-sku.repository';
import { OrderEntity } from '@/modules/order/entities/order.entity';
import { OrderRepository } from '@/modules/order/repositories/order.repository';
import { BookingEntity } from '@/modules/booking/entities/booking.entity';
import { BookingRepository } from '@/modules/booking/repositories/booking.repository';
import { CheckInEntity } from '@/modules/check-in/entities/check-in.entity';
import { CheckInRepository } from '@/modules/check-in/repositories/check-in.repository';
import { ClassroomEntity } from '@/modules/classroom/entities/classroom.entity';
import { ClassroomRepository } from '@/modules/classroom/repositories/classroom.repository';
import { InviteModule } from '@/modules/invite/invite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InstitutionEntity,
      InstitutionHonorEntity,
      InstitutionShowcaseEntity,
      InstitutionTeachingEnvEntity,
      UserEntity,
      UserInstitutionEntity,
      TeacherEntity,
      CourseEntity,
      CourseSkuEntity,
      OrderEntity,
      BookingEntity,
      CheckInEntity,
      ClassroomEntity,
    ]),
    forwardRef(() => InviteModule),
  ],
  controllers: [InstitutionController],
  providers: [
    InstitutionService,
    InstitutionRepository,
    InstitutionHonorRepository,
    InstitutionShowcaseRepository,
    InstitutionTeachingEnvRepository,
    UserRepository,
    UserInstitutionRepository,
    UserContextService,
    TeacherRepository,
    CourseRepository,
    CourseSkuRepository,
    OrderRepository,
    BookingRepository,
    CheckInRepository,
    ClassroomRepository,
  ],
  exports: [
    InstitutionService,
    InstitutionRepository,
    InstitutionHonorRepository,
    InstitutionShowcaseRepository,
    InstitutionTeachingEnvRepository,
  ],
})
export class InstitutionModule {}
