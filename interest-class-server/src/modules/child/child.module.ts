import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildController } from './child.controller';
import { ChildService } from './child.service';
import { ChildRepository } from './repositories/child.repository';
import { ChildEntity } from './entities/child.entity';
import { CommonModule } from '@/modules/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChildEntity]), CommonModule],
  controllers: [ChildController],
  providers: [ChildService, ChildRepository],
  exports: [ChildService, ChildRepository],
})
export class ChildModule {}
