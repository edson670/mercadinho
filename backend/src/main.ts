import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/errors/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  // Limite padrão do Express (100kb) é pequeno demais para os webhooks da
  // Evolution API, que embutem contexto da mensagem (citação, metadados de
  // mídia) e passam facilmente de 150-200kb mesmo em mensagens de texto simples.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Arquivos enviados (ex.: logo da empresa) servidos em /uploads — fora do prefixo da API.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const apiPrefix = config.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // CORS — aceita uma lista separada por vírgula (ex.: localhost + IP da rede
  // local, útil para testar o catálogo a partir do celular).
  const corsOrigins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Tratamento de erros centralizado
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema Mercadinho — API')
    .setDescription('API REST para gestão de mercadinho (PDV, estoque, fiado, caixa).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  Logger.log(`🚀 API em http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`📚 Swagger em http://localhost:${port}/docs`, 'Bootstrap');
}
bootstrap();
