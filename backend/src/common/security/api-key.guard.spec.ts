import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { ApiKeyGuard, type IntegrationRequest } from './api-key.guard.js';

const MASSAGE_KEY = 'massage-secret-key-0001';
const FITNESS_KEY = 'fitness-secret-key-0002';

function createGuard(keys: string | undefined): ApiKeyGuard {
  const config = {
    get: () => keys,
  } as unknown as ConfigService<EnvironmentVariables, true>;

  return new ApiKeyGuard(config);
}

function contextWith(headers: Record<string, unknown>): {
  context: ExecutionContext;
  request: IntegrationRequest;
} {
  const request = { headers } as unknown as IntegrationRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('ApiKeyGuard', () => {
  const guard = createGuard(`massage:${MASSAGE_KEY},fitness:${FITNESS_KEY}`);

  it('lets a request with a known key in and records which team it is', () => {
    const { context, request } = contextWith({ 'x-api-key': FITNESS_KEY });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.integrationClient).toBe('fitness');
  });

  it('recognizes every configured team', () => {
    const { context, request } = contextWith({ 'x-api-key': MASSAGE_KEY });

    guard.canActivate(context);

    expect(request.integrationClient).toBe('massage');
  });

  it.each([
    ['a missing header', {}],
    ['an empty key', { 'x-api-key': '' }],
    ['a wrong key', { 'x-api-key': 'definitely-wrong-key-0000' }],
    ['a prefix of a valid key', { 'x-api-key': MASSAGE_KEY.slice(0, -1) }],
    ['a valid key with extra characters', { 'x-api-key': `${MASSAGE_KEY}x` }],
    [
      'a key with a different letter case',
      { 'x-api-key': MASSAGE_KEY.toUpperCase() },
    ],
    ['a header that is not a text', { 'x-api-key': [MASSAGE_KEY] }],
  ])('rejects %s with 401 UNAUTHORIZED', (_label, headers) => {
    const { context, request } = contextWith(headers);

    expect(() => guard.canActivate(context)).toThrowError(
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
    );
    expect(request.integrationClient).toBeUndefined();
  });

  it('rejects everyone when no keys are configured', () => {
    const closed = createGuard(undefined);
    const { context } = contextWith({ 'x-api-key': MASSAGE_KEY });

    expect(() => closed.canActivate(context)).toThrowError(
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
    );
  });

  it('refuses to start with a duplicated key', () => {
    expect(() =>
      createGuard(`massage:${MASSAGE_KEY},fitness:${MASSAGE_KEY}`),
    ).toThrow(/duplicated key/);
  });
});
