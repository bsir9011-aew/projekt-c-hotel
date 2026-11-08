import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { API_PREFIX, setupApp, SWAGGER_PATH } from './app.setup.js';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  // Pozwala poprawnie zamknąć połączenie z bazą przy sygnale SIGTERM (np. w kontenerze). (DamianTchorzewski_72206)
  app.enableShutdownHooks();

  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API available at http://localhost:${port}/${API_PREFIX}`);
  logger.log(`Swagger docs at http://localhost:${port}/${SWAGGER_PATH}`);
}

await bootstrap();
