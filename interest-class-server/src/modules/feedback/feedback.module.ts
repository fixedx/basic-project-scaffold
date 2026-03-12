import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackEntity } from './entities/feedback.entity';
import { FeedbackRepository } from './repositories/feedback.repository';
import { UserContextService } from '@/common/services/user-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackEntity])],
  controllers: [FeedbackController],
  providers: [FeedbackService, FeedbackRepository, UserContextService],
  exports: [FeedbackService, FeedbackRepository],
})
export class FeedbackModule {}
