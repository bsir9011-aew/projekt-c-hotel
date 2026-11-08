import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { createOpenApiDocument } from '../src/app.setup.js';
import { createTestApp } from './create-test-app.js';

// Kontrakt API jest zapisany w docs/openapi.json i udostępniany Pawłowi oraz zespołom A, B i D. (DamianTchorzewski_72206)
// Test zawodzi, gdy kod rozjedzie się z tym plikiem. Po świadomej zmianie kontraktu uruchom: npm run openapi:update (DamianTchorzewski_72206)
describe('OpenAPI contract', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('matches docs/openapi.json', async () => {
    const document = createOpenApiDocument(app);

    await expect(`${JSON.stringify(document, null, 2)}\n`).toMatchFileSnapshot(
      '../../docs/openapi.json',
    );
  });
});
