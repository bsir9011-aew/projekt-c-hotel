import {
  SHORT_DESCRIPTION_MAX_LENGTH,
  toShortDescription,
} from './short-description.js';

describe('toShortDescription', () => {
  it('keeps a short description unchanged', () => {
    expect(toShortDescription('Komfortowy pokój z balkonem.')).toBe(
      'Komfortowy pokój z balkonem.',
    );
  });

  it('collapses whitespace and line breaks', () => {
    expect(toShortDescription('  Pokój \n\n z   widokiem  ')).toBe(
      'Pokój z widokiem',
    );
  });

  it('keeps a description of exactly the maximum length', () => {
    const exact = 'a'.repeat(SHORT_DESCRIPTION_MAX_LENGTH);

    expect(toShortDescription(exact)).toBe(exact);
  });

  it('cuts a long description at a word boundary and adds an ellipsis', () => {
    const long = 'Przestronny pokój z widokiem na ogród. '.repeat(10);
    const result = toShortDescription(long);

    expect(result.length).toBeLessThanOrEqual(SHORT_DESCRIPTION_MAX_LENGTH);
    expect(result.endsWith('…')).toBe(true);
    expect(result.slice(0, -1).endsWith('ogród')).toBe(true);
  });

  it('removes punctuation left before the ellipsis', () => {
    const text = `${'słowo '.repeat(26)}koniec, kolejne słowa`;
    const result = toShortDescription(text);

    expect(result).not.toMatch(/[,.;:!?-]…$/);
    expect(result.endsWith('…')).toBe(true);
  });

  it('cuts a text without spaces at the limit', () => {
    const result = toShortDescription('a'.repeat(300));

    expect(result).toBe(`${'a'.repeat(SHORT_DESCRIPTION_MAX_LENGTH - 1)}…`);
    expect(result.length).toBe(SHORT_DESCRIPTION_MAX_LENGTH);
  });
});
