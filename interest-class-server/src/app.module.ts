import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DemoModule } from '@/modules/demo/demo.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { InstitutionModule } from '@/modules/institution/institution.module';
import { OssModule } from '@/modules/oss/oss.module';
import { CourseModule } from '@/modules/course/course.module';
import { ClassroomModule } from '@/modules/classroom/classroom.module';
import { TeacherModule } from '@/modules/teacher/teacher.module';
import { ScheduleModule } from '@/modules/schedule/schedule.module';
import { BannerModule } from '@/modules/banner/banner.module';
import { HomeModule } from '@/modules/home/home.module';
import { BookingModule } from '@/modules/booking/booking.module';
import { OrderModule } from '@/modules/order/order.module';
import { ReviewModule } from '@/modules/review/review.module';
import { ChildModule } from '@/modules/child/child.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { CheckInModule } from '@/modules/check-in/check-in.module';
import { InviteModule } from '@/modules/invite/invite.module';
import { FavoriteModule } from '@/modules/favorite/favorite.module';
import { FeedbackModule } from '@/modules/feedback/feedback.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { AnnouncementModule } from '@/modules/announcement/announcement.module';
import { CommonModule } from '@/modules/common/common.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthMiddleware } from '@/common/middleware/auth.middleware';
import { UserContextService } from '@/common/services/user-context.service';

@Module({
  imports: [
    // ClsModule - 用于存储请求上下文
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
      },
    }),
    // 配置模块
    // 支持 .env 和 .env.[NODE_ENV] 文件，后者优先级更高
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`, // 环境特定配置（优先级高）
        '.env', // 基础配置（优先级低）
      ],
    }),
    // 数据库模块 - 使用异步配置确保环境变量已加载
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'interest_class'),
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: false, // 关闭SQL日志
        autoLoadEntities: true,
      }),
      // 配置 typeorm-transactional
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        return addTransactionalDataSource(new DataSource(options));
      },
    }),
    // JWT 模块
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    // 定时任务模块
    NestScheduleModule.forRoot(),
    // 业务模块
    CommonModule,
    NotificationModule,
    AuthModule,
    DemoModule,
    InstitutionModule,
    OssModule,
    CourseModule,
    ClassroomModule,
    TeacherModule,
    ScheduleModule,
    HomeModule,
    BannerModule,
    BookingModule,
    OrderModule,
    ReviewModule,
    ChildModule,
    PaymentModule,
    CheckInModule,
    InviteModule,
    FavoriteModule,
    FeedbackModule,
    AdminModule,
    AnnouncementModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserContextService],
  exports: [UserContextService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 配置认证中间件
    // 白名单已在 AuthMiddleware 内部维护
    consumer.apply(AuthMiddleware).forRoutes('*'); // 应用到所有路由
  }
}
