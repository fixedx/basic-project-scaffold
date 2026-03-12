import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { AnnouncementEntity } from './entities/announcement.entity';
import { AnnouncementRepository } from './repositories/announcement.repository';
import { CommonModule } from '@/modules/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity]), CommonModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, AnnouncementRepository],
  exports: [AnnouncementService, AnnouncementRepository],
})
export class AnnouncementModule {}
