# Hotel C – backend

REST API systemu rezerwacji pokoi i pakietów wypoczynkowych.
Stos: NestJS, Prisma, PostgreSQL, Swagger (OpenAPI).

Architekturę, model danych i reguły biznesowe opisuje
[docs/architecture.md](../docs/architecture.md).

## Skrypty

| Komenda              | Opis                                      |
| -------------------- | ----------------------------------------- |
| `npm run start:dev`  | Uruchomienie w trybie developerskim       |
| `npm run build`      | Kompilacja do katalogu `dist/`            |
| `npm run lint`       | Analiza statyczna kodu (oxlint)           |
| `npm test`           | Testy jednostkowe (Vitest)                |
| `npm run test:e2e`   | Testy e2e (wymagają działającej bazy)     |
