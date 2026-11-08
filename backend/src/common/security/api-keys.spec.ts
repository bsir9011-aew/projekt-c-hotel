import {
  hashApiKey,
  INTEGRATION_API_KEYS_PATTERN,
  parseApiKeys,
} from './api-keys.js';

const MASSAGE_KEY = 'massage-secret-key-0001';
const FITNESS_KEY = 'fitness-secret-key-0002';

describe('parseApiKeys', () => {
  it('returns no clients when nothing is configured', () => {
    expect(parseApiKeys(undefined)).toEqual([]);
    expect(parseApiKeys('')).toEqual([]);
    expect(parseApiKeys('   ')).toEqual([]);
  });

  it('parses every client and stores only the key digest', () => {
    const clients = parseApiKeys(
      `massage:${MASSAGE_KEY},fitness:${FITNESS_KEY}`,
    );

    expect(clients.map((client) => client.name)).toEqual([
      'massage',
      'fitness',
    ]);
    expect(clients[0]?.keyDigest.equals(hashApiKey(MASSAGE_KEY))).toBe(true);
    expect(JSON.stringify(clients)).not.toContain(MASSAGE_KEY);
  });

  it('throws on a duplicated client name', () => {
    expect(() =>
      parseApiKeys(`massage:${MASSAGE_KEY},massage:${FITNESS_KEY}`),
    ).toThrow(/duplicated client name/);
  });

  it('throws on a duplicated key', () => {
    expect(() =>
      parseApiKeys(`massage:${MASSAGE_KEY},fitness:${MASSAGE_KEY}`),
    ).toThrow(/duplicated key/);
  });
});

describe('INTEGRATION_API_KEYS_PATTERN', () => {
  it.each([
    `massage:${MASSAGE_KEY}`,
    `massage:${MASSAGE_KEY},fitness:${FITNESS_KEY}`,
    'team-a:abcdefghijklmnop',
    `vouchers:${'k'.repeat(128)}`,
  ])('accepts %s', (value) => {
    expect(value).toMatch(INTEGRATION_API_KEYS_PATTERN);
  });

  it.each([
    ['a key shorter than 16 characters', 'massage:short'],
    ['a key longer than 128 characters', `massage:${'k'.repeat(129)}`],
    ['an upper case client name', `Massage:${MASSAGE_KEY}`],
    ['a missing client name', `:${MASSAGE_KEY}`],
    ['a missing separator', MASSAGE_KEY],
    ['a trailing comma', `massage:${MASSAGE_KEY},`],
    ['spaces inside a key', 'massage:abcdefgh ijklmnopqr'],
  ])('rejects %s', (_label, value) => {
    expect(value).not.toMatch(INTEGRATION_API_KEYS_PATTERN);
  });
});
