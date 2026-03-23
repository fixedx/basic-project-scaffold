import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnumController } from './enum.controller';
import { EnumService } from './enum.service';
import { EnumRepository } from './repositories/enum.repository';
import { EnumEntity } from './entities/enum.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([EnumEntity])],
  controllers: [EnumController],
  providers: [EnumService, EnumRepository, UserContextService],
  exports: [EnumService, EnumRepository, UserContextService],
})
export class CommonModule {}
