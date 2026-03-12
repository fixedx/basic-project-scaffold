import { Module, forwardRef } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { BannerModule } from '@/modules/banner/banner.module';
import { CourseModule } from '@/modules/course/course.module';
import { InstitutionModule } from '@/modules/institution/institution.module';
import { InviteModule } from '@/modules/invite/invite.module';

@Module({
  imports: [BannerModule, forwardRef(() => CourseModule), forwardRef(() => InstitutionModule), forwardRef(() => InviteModule)],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
