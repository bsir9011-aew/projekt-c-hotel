// Testy integracyjne używają osobnej bazy, aby nigdy nie dotykać danych deweloperskich. (DamianTchorzewski_72206)
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://hotel_user:hotel_password@localhost:5432/hotel_c_test';

// Zabezpieczenie przed uruchomieniem czyszczenia tabel na bazie, która nie jest testowa. (DamianTchorzewski_72206)
export function assertTestDatabase(url: string): string {
  const name = new URL(url).pathname.slice(1);

  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(
      `Refusing to run integration tests on database "${name}". The name must end with "_test".`,
    );
  }

  return name;
}
