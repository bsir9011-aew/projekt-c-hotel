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

  describe('INTEGRATION_API_KEYS', () => {
    const keys = 'massage:dev-massage-key-0001,fitness:dev-fitness-key-0002';

    it('is optional outside production', () => {
      expect(() => validateEnv(validConfig)).not.toThrow();
    });

    it('is required in production', () => {
      expect(() =>
        validateEnv({ ...validConfig, NODE_ENV: 'production' }),
      ).toThrow(/INTEGRATION_API_KEYS/);
      expect(() =>
        validateEnv({
          ...validConfig,
          NODE_ENV: 'production',
          INTEGRATION_API_KEYS: keys,
        }),
      ).not.toThrow();
    });

    it('accepts a well formed value', () => {
      const env = validateEnv({ ...validConfig, INTEGRATION_API_KEYS: keys });

      expect(env.INTEGRATION_API_KEYS).toBe(keys);
    });

    it.each(['massage:short', 'no-separator', 'Massage:dev-massage-key-0001'])(
      'rejects the malformed value %s',
      (value) => {
        expect(() =>
          validateEnv({ ...validConfig, INTEGRATION_API_KEYS: value }),
        ).toThrow(/INTEGRATION_API_KEYS/);
      },
    );
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
