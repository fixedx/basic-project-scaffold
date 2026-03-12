import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { UserInstitutionEntity } from './entities/user-institution.entity';
import { UserRepository } from './repositories/user.repository';
import { UserInstitutionRepository } from './repositories/user-institution.repository';
import { UserContextService } from '@/common/services/user-context.service';
import { InstitutionEntity } from '@/modules/institution/entities/institution.entity';
import { InstitutionRepository } from '@/modules/institution/repositories/institution.repository';
import { InstitutionModule } from '@/modules/institution/institution.module';
import { TeacherModule } from '@/modules/teacher/teacher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserInstitutionEntity,
      InstitutionEntity,
    ]),
    forwardRef(() => InstitutionModule),
    forwardRef(() => TeacherModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    UserInstitutionRepository,
    InstitutionRepository,
    UserContextService,
  ],
  exports: [AuthService, UserRepository, UserInstitutionRepository],
})
export class AuthModule {}
