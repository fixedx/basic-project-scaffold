import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { BannerEntity } from './entities/banner.entity';
import { BannerRepository } from './repositories/banner.repository';
import { CommonModule } from '@/modules/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([BannerEntity]), CommonModule],
  controllers: [BannerController],
  providers: [BannerService, BannerRepository],
  exports: [BannerService, BannerRepository],
})
export class BannerModule {}
