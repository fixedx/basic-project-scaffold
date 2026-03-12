import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseController } from './course.controller';
import { CategoryController } from './category.controller';
import { CourseService } from './course.service';
import { CategoryService } from './category.service';
import { CourseRepository } from './repositories/course.repository';
import { CourseSkuRepository } from './repositories/course-sku.repository';
import { CategoryRepository } from './repositories/category.repository';
import { CourseEntity } from './entities/course.entity';
import { CourseSkuEntity } from './entities/course-sku.entity';
import { CategoryEntity } from './entities/category.entity';
import { UserInstitutionEntity } from '@/modules/auth/entities/user-institution.entity';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { InstitutionEntity } from '@/modules/institution/entities/institution.entity';
import { InstitutionRepository } from '@/modules/institution/repositories/institution.repository';
import { TeacherEntity } from '@/modules/teacher/entities/teacher.entity';
import { TeacherRepository } from '@/modules/teacher/repositories/teacher.repository';
import { ScheduleEntity } from '@/modules/schedule/entities/schedule.entity';
import { ScheduleRepository } from '@/modules/schedule/repositories/schedule.repository';
import { InviteModule } from '@/modules/invite/invite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseEntity,
      CourseSkuEntity,
      CategoryEntity,
      UserInstitutionEntity,
      InstitutionEntity,
      TeacherEntity,
      ScheduleEntity,
    ]),
    forwardRef(() => InviteModule),
  ],
  controllers: [CourseController, CategoryController],
  providers: [
    CourseService,
    CategoryService,
    CourseRepository,
    CourseSkuRepository,
    CategoryRepository,
    UserInstitutionRepository,
    UserContextService,
    InstitutionRepository,
    TeacherRepository,
    ScheduleRepository,
  ],
  exports: [
    CourseService,
    CategoryService,
    CourseRepository,
    CourseSkuRepository,
    CategoryRepository,
  ],
})
export class CourseModule {}
