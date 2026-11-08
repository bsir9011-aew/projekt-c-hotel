# Hotel C

Projekt zespołowy – obsługa hotelu i pakietów wypoczynkowych: wyszukiwanie
pokoi, rezerwacje, anulacje oraz integracje z zespołami od masaży, fitnessu
i voucherów.

## Struktura repozytorium

| Katalog                | Zawartość                                         |
| ---------------------- | ------------------------------------------------- |
| `frontend/`            | Aplikacja React + TypeScript + Vite               |
| `backend/`             | REST API: NestJS, Prisma, PostgreSQL, Swagger     |
| `docs/`                | Dokumentacja projektowa                           |
| `docker-compose.yml`   | Baza PostgreSQL dla środowiska lokalnego          |
| `.github/workflows/`   | CI frontendu i backendu                           |

## Dokumentacja

- [Architektura, model danych i reguły biznesowe](docs/architecture.md)
- [Kontrakt REST API: endpointy, błędy, decyzje do akceptacji](docs/api-contract.md)
- [Kontrakt w formacie OpenAPI](docs/openapi.json) (to samo co Swagger pod `/api/docs`)

## Uruchomienie lokalne

Wymagania: Node.js 22 lub nowszy oraz Docker z Docker Compose.

1. Uruchom bazę danych:

   ```bash
   cp .env.example .env
   docker compose up -d
   ```

2. Uruchom backend:

   ```bash
   cd backend
   cp .env.example .env
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm run start:dev
   ```

3. Uruchom frontend (w osobnym terminalu):

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

Po starcie dostępne są:

- API: <http://localhost:3000/api/v1>
- Dokumentacja Swagger: <http://localhost:3000/api/docs>
- Stan aplikacji i bazy: <http://localhost:3000/api/v1/health>
- Frontend: <http://localhost:5173>

## Testy

```bash
cd backend
npm run lint
npm test
npm run test:e2e
```

Testy e2e używają atrapy bazy danych, więc nie wymagają uruchomionego PostgreSQL.

Kontrakt API jest zapisany w `docs/openapi.json`, a test e2e pilnuje, żeby plik był zgodny z kodem.
Po świadomej zmianie DTO lub endpointów odśwież go poleceniem:

```bash
cd backend
npm run openapi:update
```
