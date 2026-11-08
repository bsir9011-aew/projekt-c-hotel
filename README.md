# Hotel C

Projekt zespołowy – obsługa hotelu i pakietów wypoczynkowych: wyszukiwanie
pokoi, rezerwacje, anulacje oraz integracje z zespołami od masaży, fitnessu
i voucherów.

## Struktura repozytorium

| Katalog                | Zawartość                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `frontend/`            | Aplikacja React + TypeScript + Vite (osobny projekt npm)      |
| `backend/`             | REST API: NestJS, Prisma, PostgreSQL, Swagger (osobny projekt npm) |
| `scripts/`             | Skrypty `npm run setup` i `npm start` z katalogu głównego     |
| `docs/`                | Dokumentacja projektowa                                       |
| `docker-compose.yml`   | Baza PostgreSQL dla środowiska lokalnego                      |
| `.github/workflows/`   | CI frontendu i backendu                                       |

## Dokumentacja

- [Architektura, model danych i reguły biznesowe](docs/architecture.md)
- [Kontrakt REST API: endpointy, błędy, decyzje do akceptacji](docs/api-contract.md)
- [Kontrakt w formacie OpenAPI](docs/openapi.json) (to samo co Swagger pod `/api/docs`)

## Pierwsze kroki

### Co musisz mieć zainstalowane

| Narzędzie                                    | Wersja                          | Jak sprawdzić     |
| -------------------------------------------- | ------------------------------- | ----------------- |
| Git                                          | dowolna                         | `git --version`   |
| Node.js (razem z npm)                        | 22.12 lub nowsza                | `node -v`         |
| Docker z Docker Compose (Windows i macOS: Docker Desktop) | uruchomiony, status „running" | `docker info`     |

Muszą być wolne porty: `3000` (API), `5173` (frontend) i `5432` (baza danych).

### 1. Pobierz repozytorium

```bash
git clone https://github.com/bsir9011-aew/projekt-c-hotel.git
cd projekt-c-hotel
```

> Backend i skrypty uruchomieniowe są na razie na gałęziach funkcyjnych, a `main` zawiera tylko prototyp frontendu.
> Dopóki Pull Requesty nie zostaną zmergowane, przełącz się na gałąź z całością:
> `git switch feature/HOTEL-5-bookings-service`.

### 2. Zainstaluj i skonfiguruj projekt (jednorazowo)

Uruchom w katalogu głównym:

```bash
npm run setup
```

To jedyna instalacja, jaką trzeba wykonać. **Nie uruchamiaj ręcznie `npm install`** ani w katalogu głównym
(nie ma w nim żadnych zależności), ani w `backend/` czy `frontend/`. Backend i frontend to dwa niezależne projekty
npm z własnymi zależnościami, dlatego skrypt instaluje je osobno, jedno po drugim:

| Krok | Co się dzieje                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------- |
| 1/5  | Tworzy pliki `.env` z szablonów `.env.example`: w katalogu głównym i w `backend/`. Istniejących nie nadpisuje. |
| 2/5  | Uruchamia bazę PostgreSQL w Dockerze (`docker compose up -d --wait`) i czeka, aż przyjmuje połączenia. |
| 3/5  | Instaluje zależności backendu (`npm ci` w `backend/`) i frontendu (`npm ci` w `frontend/`).        |
| 4/5  | Generuje klienta Prisma i stosuje migracje bazy (`prisma generate`, `prisma migrate deploy`).      |
| 5/5  | Wczytuje dane demonstracyjne: pokoje, pakiety i trzy rezerwacje (`npm run db:seed`).               |

Pierwsze uruchomienie trwa od kilkudziesięciu sekund do kilku minut (Docker pobiera wtedy obraz PostgreSQL).
`npm ci` instaluje dokładnie te wersje, które są w `package-lock.json`, i nie zmienia tego pliku.

### 3. Uruchom aplikację

```bash
npm start
```

Jedno polecenie uruchamia bazę, backend i frontend. Logi obu aplikacji są oznaczone prefiksami `[api]` i `[web]`.
Gdy wszystko działa, w terminalu pojawia się komunikat `Ready.` z adresami. Zatrzymanie: `Ctrl+C` (zatrzymuje API
i frontend, a baza działa dalej).

### 4. Sprawdź, czy działa

| Co                 | Adres                                  | Czego oczekiwać                                            |
| ------------------ | -------------------------------------- | ---------------------------------------------------------- |
| Frontend           | <http://localhost:5173>                | strona aplikacji                                           |
| Stan API i bazy    | <http://localhost:3000/api/v1/health>  | JSON ze `status: "ok"` i `database: "up"`                  |
| Dokumentacja API   | <http://localhost:3000/api/docs>       | Swagger z listą endpointów, które można wywoływać z poziomu strony |
| Lista pokoi        | <http://localhost:3000/api/v1/rooms>   | JSON z pokojami z danych demonstracyjnych                  |

## Na co dzień

Praca po pierwszej konfiguracji wymaga tylko `npm start`. Bazę zatrzymasz poleceniem `npm run db:stop`.

**Po pobraniu zmian z repozytorium (`git pull`)** w większości przypadków nic więcej nie trzeba robić.
Powtórz `npm run setup`, jeśli w pobranych zmianach:

- zmienił się plik `package-lock.json` w `backend/` lub `frontend/` (nowe lub zmienione zależności),
- pojawiła się nowa migracja w `backend/prisma/migrations/` (zmiana schematu bazy).

Skrypt jest bezpieczny przy powtórzeniu: nie nadpisuje plików `.env` ani Twoich rezerwacji. Przywraca natomiast dane
demonstracyjne do stanu początkowego (m.in. anulowane rezerwacje demo wracają do statusu potwierdzonych), co przydaje
się po ręcznych testach anulacji.

| Polecenie (w katalogu głównym) | Co robi                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `npm run setup`                | pierwsza konfiguracja projektu (szczegóły wyżej)            |
| `npm start`                    | baza + backend + frontend w trybie developerskim            |
| `npm run db:up` / `db:stop`    | uruchamia / zatrzymuje samą bazę                            |
| `npm test`                     | testy jednostkowe backendu i frontendu                      |
| `npm run test:integration`     | testy backendu na prawdziwym PostgreSQL                     |
| `npm run lint`                 | analiza kodu backendu i frontendu                           |
| `npm run build`                | kompilacja backendu i frontendu                             |

**Czysta baza od zera** (usuwa wszystkie lokalne dane, łącznie z własnymi rezerwacjami):

```bash
docker compose down -v
```

```bash
npm run setup
```

## Ręcznie, krok po kroku

Skrypty `npm run setup` i `npm start` nie są wymagane. To samo można zrobić ręcznie, w trzech terminalach.

1. Baza danych (w katalogu głównym):

   ```bash
   cp .env.example .env
   docker compose up -d
   ```

2. Backend (instalacja zależności backendu i uruchomienie):

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

3. Frontend (instalacja zależności frontendu i uruchomienie, w osobnym terminalu):

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

## Najczęstsze problemy

**`Node.js 22.12 or newer is required`.** Zainstaluj nowszego Node.js (najprościej przez [nvm](https://github.com/nvm-sh/nvm)
albo instalator z [nodejs.org](https://nodejs.org)) i uruchom polecenie ponownie.

**`Dependencies are not installed yet` lub brak pliku `backend/.env`.** To znaczy, że nie wykonano jeszcze
`npm run setup`. Uruchom go raz, a potem `npm start`.

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
`backend/.env`. Jeśli port 5173 jest zajęty, Vite uruchomi frontend na innym porcie, a API przyjmuje zapytania
(CORS) tylko z adresu ustawionego w `FRONTEND_URL` w `backend/.env`, więc dostosuj tę wartość.

**Port 5432 jest zajęty** (np. przez lokalnie zainstalowany PostgreSQL). Ustaw wolny port w zmiennej `POSTGRES_PORT`
w pliku `.env` w katalogu głównym oraz ten sam port w `DATABASE_URL` w `backend/.env`, a potem uruchom `npm run db:up`.

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

Z katalogu głównego:

```bash
npm run lint
npm test
npm run test:integration
```

Testy e2e uruchamia się z katalogu `backend/`:

```bash
cd backend
npm run test:e2e
```

| Polecenie                 | Gdzie       | Co sprawdza                                         | Wymaga bazy  |
| ------------------------- | ----------- | --------------------------------------------------- | ------------ |
| `npm test`                | katalog główny (backend i frontend) lub `backend/` | Testy jednostkowe: logika, wycena, daty, DTO | nie |
| `npm run test:e2e`        | `backend/`  | Walidacja żądań, format błędów, CORS, kontrakt API  | nie (atrapa) |
| `npm run test:integration`| katalog główny lub `backend/` | Cała aplikacja na prawdziwym PostgreSQL | tak          |

Testy integracyjne działają na osobnej bazie `hotel_c_test`, którą tworzą i migrują same.
Odmówią uruchomienia na bazie, której nazwa nie kończy się na `_test`, więc nie ruszą danych deweloperskich.
Wymagają działającego kontenera z bazą (`npm run db:up`).

Kontrakt API jest zapisany w `docs/openapi.json`, a test e2e pilnuje, żeby plik był zgodny z kodem.
Po świadomej zmianie DTO lub endpointów odśwież go poleceniem:

```bash
cd backend
npm run openapi:update
```
