import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const uploadsRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedCorsOrigins = [
    'http://localhost:5173',
    'https://ai-no-code-zeta.vercel.app',
  ];

  app.enableCors({
    origin: allowedCorsOrigins,
    credentials: true,
  });

  // CORS trước static; thêm setHeaders để mọi response /uploads (kể cả 304) có header CORS cho XHR Phaser.
  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      const originHeader = res.req?.headers?.origin;
      const origin =
        typeof originHeader === 'string' ? originHeader : undefined;
      const allow =
        origin && allowedCorsOrigins.includes(origin)
          ? origin
          : allowedCorsOrigins[0];
      res.setHeader('Access-Control-Allow-Origin', allow);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    },
  });
  
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI No-code Studio API')
    .setDescription('REST API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}
bootstrap();
