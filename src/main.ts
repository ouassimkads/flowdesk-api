import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global prefix ────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation pipe ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.enableCors({
    // origin: [
    //   'http://localhost:5173',
    //   'http://localhost:4141',
    //   'http://192.168.100.104:5173',
    //   'http://127.0.0.1:4141',
    //   'http://192.168.100.104:4141',
    //   'http://127.0.0.1:5173',
    // ],
    origin : '*', 
    credentials: true,
  });

  // ── Swagger ──────────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('FlowDesk API')
    .setDescription('Multi-step document upload & approval workflow')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 FlowDesk API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs at  http://localhost:${port}/api/docs`);
}

bootstrap();
