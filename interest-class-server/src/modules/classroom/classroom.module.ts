import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassroomController } from './classroom.controller';
import { ClassroomService } from './classroom.service';
import { ClassroomEntity } from './entities/classroom.entity';
import { ClassroomRepository } from './repositories/classroom.repository';
import { UserInstitutionRepository } from '@/modules/auth/repositories/user-institution.repository';
import { UserInstitutionEntity } from '@/modules/auth/entities/user-institution.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassroomEntity, UserInstitutionEntity])],
  controllers: [ClassroomController],
  providers: [
    ClassroomService,
    ClassroomRepository,
    UserInstitutionRepository,
    UserContextService,
  ],
  exports: [ClassroomService, ClassroomRepository],
})
export class ClassroomModule {}
