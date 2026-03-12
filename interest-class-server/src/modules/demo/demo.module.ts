import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoEntity } from './entities/demo.entity';
import { DemoRepository } from './repositories/demo.repository';
import { UserContextService } from '@/common/services/user-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([DemoEntity])],
  controllers: [DemoController],
  providers: [DemoService, DemoRepository, UserContextService],
  exports: [DemoService, DemoRepository],
})
export class DemoModule {}
