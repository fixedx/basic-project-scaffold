import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { FavoriteRepository } from './repositories/favorite.repository';
import { FavoriteEntity } from './entities/favorite.entity';
import { CommonModule } from '@/modules/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteEntity]), CommonModule],
  controllers: [FavoriteController],
  providers: [FavoriteService, FavoriteRepository],
  exports: [FavoriteService, FavoriteRepository],
})
export class FavoriteModule {}
