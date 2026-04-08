import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      logger: new Logger(),
    },
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable dependency injection for class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // CORS Configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization,X-Api-Key,X-Timestamp,X-Signature',
  });

  // Serve widget dist files for embed preview
  const widgetDistPath = join(process.cwd(), '..', 'widget', 'dist');
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.register(require('@fastify/static'), {
    root: widgetDistPath,
    prefix: '/widget-assets/',
    decorateReply: false,
  });

  // Swagger Documentation
  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', true);
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Casino Chat SaaS Backend')
      .setDescription(
        'API documentation for Casino Chat SaaS Platform Backend',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'jwt-auth',
      )
      .addApiKey(
        { type: 'apiKey', name: 'X-Api-Key', in: 'header' },
        'api-key-auth',
      )
      .addServer(`http://localhost:${port}`, 'Local Development')
      .addServer('https://api.casinochat.com', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port, '0.0.0.0', () => {
    console.log(`Casino Chat SaaS Backend running on port ${port}`);
    console.log(`Environment: ${nodeEnv}`);
    console.log(`Swagger: ${swaggerEnabled ? 'enabled' : 'disabled'}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
