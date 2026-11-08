# Hotel C – backend

REST API systemu rezerwacji pokoi i pakietów wypoczynkowych.
Stos: NestJS, Prisma, PostgreSQL, Swagger (OpenAPI).

Pierwsze uruchomienie całego projektu (baza, backend i frontend) opisuje
[README w katalogu głównym](../README.md#pierwsze-kroki): wystarczą `npm run setup` i `npm start`.
Architekturę, model danych i reguły biznesowe opisuje [docs/architecture.md](../docs/architecture.md).

## Skrypty

Poniższe polecenia uruchamia się w katalogu `backend/`. Zależności backendu instaluje `npm run setup`
z katalogu głównego (albo ręcznie `npm ci` w tym katalogu).

| Komenda                    | Opis                                                          | Wymaga bazy |
| -------------------------- | ------------------------------------------------------------- | ----------- |
| `npm run start:dev`        | Uruchomienie w trybie developerskim (z przeładowaniem)        | tak         |
| `npm run build`            | Kompilacja do katalogu `dist/`                                | nie         |
| `npm run lint`             | Analiza statyczna kodu (oxlint)                               | nie         |
| `npm test`                 | Testy jednostkowe (Vitest)                                    | nie         |
| `npm run test:e2e`         | Testy e2e: walidacja, format błędów, kontrakt (baza jest atrapą) | nie      |
| `npm run test:integration` | Testy na prawdziwym PostgreSQL (osobna baza `hotel_c_test`)   | tak         |
| `npm run db:seed`          | Dane demonstracyjne (pokoje, pakiety, rezerwacje)             | tak         |
| `npm run openapi:update`   | Odświeżenie `docs/openapi.json` po zmianie DTO lub endpointów | nie         |
