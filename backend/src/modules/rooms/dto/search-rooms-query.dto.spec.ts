import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { flattenValidationErrors } from '../../../common/errors/validation-exception.factory.js';
import { VALIDATION_OPTIONS } from '../../../common/validation/validation.options.js';
import { SearchRoomsQueryDto } from './search-rooms-query.dto.js';

// Odtwarza zachowanie ValidationPipe z app.setup.ts: konwersję oraz te same opcje walidacji. (DamianTchorzewski_72206)
async function check(query: Record<string, unknown>) {
  const instance = plainToInstance(SearchRoomsQueryDto, query);
  const errors = await validate(instance, VALIDATION_OPTIONS);

  return { instance, details: flattenValidationErrors(errors) };
}

const fields = (details: { field: string }[]) =>
  details.map((detail) => detail.field);

describe('SearchRoomsQueryDto', () => {
  it('accepts an empty query', async () => {
    expect((await check({})).details).toEqual([]);
  });

  it('converts numbers and booleans sent as text', async () => {
    const { instance, details } = await check({
      checkIn: '2026-11-15',
      checkOut: '2026-11-18',
      guests: '2',
      minPrice: '200.5',
      maxPrice: '600',
      onlyAvailable: 'false',
    });

    expect(details).toEqual([]);
    expect(instance.guests).toBe(2);
    expect(instance.minPrice).toBe(200.5);
    expect(instance.maxPrice).toBe(600);
    expect(instance.onlyAvailable).toBe(false);
  });

  it('requires checkOut when only checkIn is given', async () => {
    const { details } = await check({ checkIn: '2026-11-15' });

    expect(fields(details)).toEqual(['checkOut']);
  });

  it('requires checkIn when only checkOut is given', async () => {
    const { details } = await check({ checkOut: '2026-11-18' });

    expect(fields(details)).toEqual(['checkIn']);
  });

  it('rejects a checkOut that is not later than checkIn', async () => {
    const { details } = await check({
      checkIn: '2026-11-15',
      checkOut: '2026-11-15',
    });

    expect(details).toEqual([
      { field: 'checkOut', message: 'checkOut must be later than checkIn' },
    ]);
  });

  it.each(['0', '21', '1.5', 'abc'])('rejects guests=%s', async (guests) => {
    expect(fields((await check({ guests })).details)).toContain('guests');
  });

  it('rejects negative prices', async () => {
    const { details } = await check({ minPrice: '-1', maxPrice: '-5' });

    expect(fields(details)).toEqual(['minPrice', 'maxPrice']);
  });

  it('rejects prices with more than two decimal places', async () => {
    expect(fields((await check({ minPrice: '10.999' })).details)).toEqual([
      'minPrice',
    ]);
  });

  it('rejects a value that is not true or false for onlyAvailable', async () => {
    expect(fields((await check({ onlyAvailable: 'yes' })).details)).toEqual([
      'onlyAvailable',
    ]);
  });

  it('rejects unknown parameters', async () => {
    expect(await check({ foo: 'bar' })).toMatchObject({
      details: [{ field: 'foo', message: 'property foo should not exist' }],
    });
  });
});
