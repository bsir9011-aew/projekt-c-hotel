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

Wymagania: Node.js 22 lub nowszy, Git oraz Docker (na Windowsie Docker Desktop, który musi być uruchomiony).

### Szybki start (zalecany)

Raz na nowej maszynie:

```bash
npm run setup
```

Potem za każdym razem:

```bash
npm start
```

`npm run setup` tworzy pliki `.env`, uruchamia bazę, instaluje zależności, stosuje migracje i wczytuje dane
demonstracyjne. Można go bezpiecznie powtórzyć, np. po pobraniu nowych zależności. `npm start` uruchamia bazę,
backend i frontend jednym poleceniem, a logi obu pokazuje z prefiksami `[api]` i `[web]`. Zatrzymanie: `Ctrl+C`.
Baza działa dalej i zatrzymasz ją poleceniem `npm run db:stop`.

| Polecenie (w katalogu głównym) | Co robi                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `npm run setup`                | pierwsza konfiguracja projektu                              |
| `npm start`                    | baza + backend + frontend w trybie developerskim            |
| `npm run db:up` / `db:stop`    | uruchamia / zatrzymuje samą bazę                            |
| `npm test`                     | testy jednostkowe backendu i frontendu                      |
| `npm run test:integration`     | testy backendu na prawdziwym PostgreSQL                     |
| `npm run lint`                 | analiza kodu backendu i frontendu                           |
| `npm run build`                | kompilacja backendu i frontendu                             |

### Ręcznie, krok po kroku

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
   npm run db:seed
   npm run start:dev
   ```

   `npm run db:seed` wypełnia bazę danymi demonstracyjnymi: 10 aktywnych pokoi (w tym trzy
   z prototypu frontendu), 3 aktywne pakiety i 3 rezerwacje. Można go uruchamiać wielokrotnie.

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

## Najczęstsze problemy

**„Docker is not running or does not respond".** Uruchom Docker Desktop i poczekaj, aż pokaże, że działa.

**Docker Desktop kończy się błędem `initializing Inference manager … dockerInference … The file cannot be accessed by the system`**
(Windows, po nieczystym zamknięciu Dockera). Zostają wtedy uszkodzone pliki gniazd, których Windows nie pozwala usunąć,
ale pozwala zmienić nazwę ich katalogów. Zamknij Docker Desktop (ikona przy zegarze, „Quit Docker Desktop"), a w
PowerShellu wykonaj:

```powershell
Rename-Item "$env:LOCALAPPDATA\Docker\run" "run.stale"
```

```powershell
Rename-Item "$env:LOCALAPPDATA\docker-secrets-engine" "docker-secrets-engine.stale"
```

Jeśli któryś katalog nie istnieje, pomiń to polecenie, a jeśli nazwa `.stale` jest już zajęta, użyj innej. Potem
uruchom Docker Desktop ponownie. Aby tego uniknąć, zamykaj Docker Desktop z menu przy zegarze, a nie przez
Menedżera zadań.

**Port 3000 lub 5173 jest zajęty.** Zamknij poprzednio uruchomiony projekt. Port API zmienisz zmienną `PORT` w
`backend/.env`.

**Brak pliku `backend/.env` lub brak zależności.** Uruchom `npm run setup`.

## Dane demonstracyjne do ręcznych testów

Po `npm run db:seed` w bazie są rezerwacje, na których można od razu sprawdzić anulację i weryfikację pobytu
(w Swaggerze pod `/api/docs`, w Insomnii lub przez `curl`):

| Kod rezerwacji   | E-mail                  | Co pokazuje                                                              |
| ---------------- | ----------------------- | ------------------------------------------------------------------------ |
| `HTL-2026-DM2A`  | `anna.demo@example.com` | przyszła rezerwacja (za 14 dni), można ją anulować                       |
| `HTL-2026-DM3B`  | `piotr.demo@example.com`| przyszła rezerwacja z pakietem All-Inclusive (za 20 dni)                 |
| `HTL-2026-DM4C`  | `ewa.demo@example.com`  | trwający pobyt z pakietem Fitness: weryfikacja `isActive: true`, anulacja zwraca 422 |

Endpointy `/integrations/*` wymagają nagłówka `X-API-Key`. Lokalnie działają klucze z `backend/.env.example`
(`dev-massage-key-0001` i `dev-fitness-key-0002`). Działanie klucza opisuje sekcja „Klucz API" w
[kontrakcie API](docs/api-contract.md).

## Testy

```bash
cd backend
npm run lint
npm test
npm run test:e2e
npm run test:integration
```

| Polecenie                 | Co sprawdza                                         | Wymaga bazy |
| ------------------------- | --------------------------------------------------- | ----------- |
| `npm test`                | Testy jednostkowe: logika, wycena, daty, DTO        | nie         |
| `npm run test:e2e`        | Walidacja żądań, format błędów, CORS, kontrakt API  | nie (atrapa) |
| `npm run test:integration`| Cała aplikacja na prawdziwym PostgreSQL             | tak         |

Testy integracyjne działają na osobnej bazie `hotel_c_test`, którą tworzą i migrują same.
Odmówią uruchomienia na bazie, której nazwa nie kończy się na `_test`, więc nie ruszą danych deweloperskich.
Wymagają działającego kontenera z bazą (`docker compose up -d`).

Kontrakt API jest zapisany w `docs/openapi.json`, a test e2e pilnuje, żeby plik był zgodny z kodem.
Po świadomej zmianie DTO lub endpointów odśwież go poleceniem:

```bash
cd backend
npm run openapi:update
```
