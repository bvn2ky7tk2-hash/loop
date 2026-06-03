import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { validateEnv } from './common/env-validation';

// Nguồn 502 hay gặp: lỗi async ở background task (Telegram poller, BullMQ worker,
// HrEventBus, cron, fire-and-forget .catch) reject không bắt được → Node crash cả
// process → proxy trả 502 đến khi restart. Bắt ở mức process để LOG và GIỮ process sống.
function installProcessGuards(logger: { error: (msg: any, ...args: any[]) => void }) {
  process.on('unhandledRejection', (reason: any) => {
    logger.error(
      `[unhandledRejection] ${reason?.stack ?? reason?.message ?? reason}`,
      'ProcessGuard',
    );
  });
  process.on('uncaughtException', (err: Error) => {
    // Log nhưng không exit — tránh sập server gây 502 hàng loạt. Theo dõi log để truy nguyên.
    logger.error(`[uncaughtException] ${err?.stack ?? err?.message ?? err}`, 'ProcessGuard');
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const appLogger = app.get(Logger);
  app.useLogger(appLogger);
  installProcessGuards(appLogger);
  app.enableShutdownHooks();

  // Validate required env vars and warn on missing ones
  const { issues } = validateEnv();
  issues.forEach((i) =>
    appLogger.warn(`ENV ${i.level}: ${i.key} — ${i.description}`, 'EnvValidation'),
  );
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  }));
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger chỉ bật ngoài production — không phơi schema API công khai trên prod.
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Loop API')
      .setDescription('Loop Project Management API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8081', 'http://192.168.2.204:8081'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
