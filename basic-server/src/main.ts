import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';

async function bootstrap() {
  // ⚠️ 关键：必须最先初始化，使用 ASYNC_LOCAL_STORAGE 与 nestjs-cls 兼容
  initializeTransactionalContext({ storageDriver: StorageDriver.ASYNC_LOCAL_STORAGE });

  const app = await NestFactory.create(AppModule);

  // 设置全局路径前缀（小程序端使用）
  app.setGlobalPrefix('api');

  // 全局注册异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局注册响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局注册验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 启用 CORS
  app.enableCors();

  await app.listen(process.env.PORT ?? 8888);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 8888}`,
  );
  console.log(`API 接口前缀: /api`);
  console.log(`管理后台接口前缀: /admin (待实现)`);
}
void bootstrap();
