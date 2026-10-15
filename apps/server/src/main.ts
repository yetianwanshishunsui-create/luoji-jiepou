import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.set('trust proxy', 1);
  // 最先执行，保证守卫 / 过滤器抛出的错误也带 traceId
  app.use((req: { traceId?: string; headers: Record<string, unknown> }, _res: unknown, next: () => void) => {
    req.traceId = (req.headers['x-trace-id'] as string) || randomUUID();
    next();
  });
  app.enableCors({ origin: config.get('corsOrigins', { infer: true }), credentials: true });
  app.enableShutdownHooks();

  if (config.get('env', { infer: true }) !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('逻辑解剖小程序 API')
      .setDescription('小程序端 /api/v1，管理后台 /admin/v1')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));
  }

  const port = config.get('port', { infer: true });
  await app.listen(port);
  Logger.log(`Server listening on http://localhost:${port}  (docs: /docs)`, 'Bootstrap');
}

bootstrap();
