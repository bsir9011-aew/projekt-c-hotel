import { NodeEnvironment, validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://user:password@localhost:5432/hotel',
  };

  it('applies default values for optional variables', () => {
    const env = validateEnv(validConfig);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe(NodeEnvironment.Development);
    expect(env.FRONTEND_URL).toBe('http://localhost:5173');
  });

  it('converts PORT from text to a number', () => {
    const env = validateEnv({ ...validConfig, PORT: '4000' });

    expect(env.PORT).toBe(4000);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a PORT outside the valid range', () => {
    expect(() => validateEnv({ ...validConfig, PORT: '70000' })).toThrow(
      /PORT/,
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('rejects a FRONTEND_URL that is not a URL', () => {
    expect(() =>
      validateEnv({ ...validConfig, FRONTEND_URL: 'not-a-url' }),
    ).toThrow(/FRONTEND_URL/);
  });
});
