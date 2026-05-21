import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RolesGuard } from './modules/auth/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });

  // Trust nginx reverse proxy so req.ip reflects the real client IP
  app.set('trust proxy', 1);

  // Body parsers with 10mb limit (matches nginx client_max_body_size)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // Serve uploads (fallback for direct access; nginx handles this in production)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // CORS — allow all origins (mobile apps bypass CORS; web dashboard is whitelisted)
  const adminUrl = process.env.ADMIN_DASHBOARD_URL;
  app.enableCors({
    origin: adminUrl ? [adminUrl, /^http:\/\/localhost(:\d+)?$/] : true,
    credentials: true,
  });

  // Health check — registered before NestJS routes so it always responds
  app.getHttpAdapter().get('/api/v1/health', (_req: any, res: any) => {
    res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global exception filter — Arabic-friendly error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Wrap all responses in { success, data, timestamp }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Roles guard
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));

  // Swagger — development only
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('YallaPlay API')
      .setDescription('منصة حجز الملاعب الرياضية')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📖 Swagger: http://localhost:${process.env.PORT || 3000}/api/docs`);
  }

  // Graceful shutdown — lets Bull finish active jobs before exit
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 YallaPlay API running on port ${port}`);
}

bootstrap();
