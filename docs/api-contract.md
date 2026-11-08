# Hotel C – kontrakt REST API (wersja 1.0, szkic do akceptacji)

Dokument opisuje, jak frontend oraz zespoły zewnętrzne (A – masaże, B – fitness,
D – vouchery) komunikują się z backendem hotelu. Powstał w zadaniu HOTEL-10.

| Forma kontraktu         | Gdzie                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| Ten dokument            | opis, przykłady, reguły i decyzje do akceptacji                      |
| Plik OpenAPI 3.1        | [`docs/openapi.json`](openapi.json), zawsze zgodny z kodem (test w CI) |
| Interaktywna dokumentacja | `http://localhost:3000/api/docs` (Swagger UI)                      |

> **Status implementacji:**
>
> | Endpointy                                              | Stan                                |
> | ------------------------------------------------------ | ----------------------------------- |
> | `GET /health`, `GET /rooms`, `GET /rooms/{id}`, `GET /packages` | działają (HOTEL-6)         |
> | `POST /bookings`, `POST /bookings/cancel`, weryfikacja pobytu   | `501 NOT_IMPLEMENTED` (HOTEL-5) |
>
> Walidacja żądań i format błędów działają we wszystkich endpointach. Sprawdzanie
> klucza API w `/integrations/*` (`401`) zacznie działać razem z endpointem
> weryfikacji w HOTEL-5. Dane demonstracyjne wczytuje `npm run db:seed`.

## 1. Zasady ogólne

| Temat            | Ustalenie                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Adres bazowy     | `http://localhost:3000/api/v1`                                                              |
| Format           | JSON w UTF-8, nagłówek `Content-Type: application/json`                                     |
| Nazwy pól        | `camelCase`, po angielsku                                                                   |
| Daty             | `RRRR-MM-DD`, dzień kalendarzowy w strefie `Europe/Warsaw` (np. `2026-11-15`)               |
| Znaczniki czasu  | ISO 8601 w UTC (np. `2026-11-08T15:30:00.000Z`)                                             |
| Kwoty            | PLN, liczba (`number`) z maksymalnie dwoma miejscami po przecinku, np. `350` lub `349.5`    |
| Identyfikatory   | UUID (np. `a1b2c3d4-e5f6-4890-abcd-ef1234567890`)                                           |
| Kod rezerwacji   | `HTL-<rok>-<4 znaki>`, np. `HTL-2026-X89B`. Znaki: `A-H J K M N P-Z 2-9` (bez I, L, O, 0, 1) |
| Odpowiedź        | pojedynczy zasób zwracany wprost; lista w polu `data` (pokoje także z `meta`)               |
| Brak wartości    | w odpowiedziach pole bez wartości ma `null` i nigdy nie jest pomijane                       |
| Nowe pola        | klient ignoruje nieznane pola w odpowiedziach, dzięki czemu można je dodawać bez nowej wersji |
| Wersjonowanie    | zmiany zgodne wstecz zostają w `v1`; zmiana łamiąca oznacza `/api/v2`                       |
| CORS             | dopuszczony jest tylko adres frontendu z konfiguracji; zespoły zewnętrzne łączą się z serwera |
| Autoryzacja      | endpointy publiczne bez klucza; `/integrations/*` wymaga nagłówka `X-API-Key`               |

### Walidacja żądań

- Nieznane pola w treści żądania lub w parametrach są odrzucane (`400`). Dotyczy to
  także pól zagnieżdżonych. Klient nie może np. wysłać własnej ceny rezerwacji.
- Dla każdego pola zwracany jest **jeden** komunikat. Brak wartości daje komunikat
  o typie (np. `guestsCount must be an integer number`), a poprawny typ spoza zakresu
  komunikat o zakresie.
- Teksty (imiona, e-mail, telefon, kod vouchera, powód anulacji) są przycinane z białych znaków.
  Kod rezerwacji nie rozróżnia wielkości liter.

### Limity żądań

Każdy adres IP ma ograniczoną liczbę żądań na minutę, liczoną osobno dla każdego endpointu:

| Endpoint                                    | Limit na minutę |
| ------------------------------------------- | --------------- |
| `POST /bookings/cancel`                     | 5               |
| `GET /integrations/...`                     | 60              |
| pozostałe                                   | 120             |

- Po przekroczeniu limitu serwer odpowiada `429 TOO_MANY_REQUESTS`, a nagłówek `Retry-After` podaje
  w sekundach, kiedy można spróbować ponownie.
- Limit liczy każde żądanie, także błędne i bez poprawnego klucza. Dzięki temu nie da się
  zgadywać kodów rezerwacji ani kluczy API bez ograniczeń.
- Limit jest liczony w pamięci jednej instancji serwera. Za serwerem pośredniczącym (proxy)
  trzeba włączyć odczyt prawdziwego adresu klienta, bo inaczej wszyscy użytkownicy wyglądają jak jeden.

### Klucz API (`X-API-Key`)

Endpointy `/integrations/*` są przeznaczone dla zespołów zewnętrznych (masaże, fitness), a nie dla gości.
Klucz API to tajne hasło **programu**, a nie człowieka: pozwala serwerowi rozpoznać, który zespół pyta.

- Każdy zespół dostaje własny klucz (od 16 do 128 znaków) od administratora hotelu.
  Dzięki temu pojedynczy klucz można wymienić bez wpływu na pozostałych.
- Klucz przekazuje się w nagłówku: `X-API-Key: <klucz>`. Nigdy w adresie URL, bo trafia on do logów.
- Brak klucza albo zły klucz daje `401 UNAUTHORIZED`. Sprawdzenie następuje przed walidacją,
  więc osoba bez klucza nie dowie się nic o formacie danych.
- Wywołania powinny pochodzić z serwera danego zespołu, nigdy z przeglądarki, bo klucz byłby widoczny dla każdego.
- Klucze są skonfigurowane po stronie serwera zmienną `INTEGRATION_API_KEYS`
  w formacie `nazwa:klucz,nazwa:klucz` (patrz `backend/.env.example`). W produkcji zmienna jest wymagana.
  Bez niej nikt nie ma dostępu do endpointów integracyjnych.
- Serwer porównuje klucze w stałym czasie i nie zapisuje ich w logach.

## 2. Format błędów

Każdy błąd, także nieoczekiwany, ma ten sam kształt:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "ROOM_NOT_AVAILABLE",
  "message": "The room is not available for the selected dates.",
  "details": [],
  "timestamp": "2026-11-08T15:30:00.000Z",
  "path": "/api/v1/bookings"
}
```

- `code` to stabilny kod do obsługi w aplikacji. `message` jest tylko dla człowieka i może się zmieniać.
- `details` zawiera problemy z konkretnymi polami albo jest pustą tablicą:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "details": [
    { "field": "guestDetails.email", "message": "email must be an email" },
    { "field": "checkOut", "message": "checkOut must be later than checkIn" }
  ],
  "timestamp": "2026-11-08T15:30:00.000Z",
  "path": "/api/v1/bookings"
}
```

- Ani `path`, ani `message` nie zawierają query stringa, bo mógłby on zawierać dane osobowe.
- Błędy `500` nie ujawniają szczegółów. Przyczyna trafia tylko do logów serwera.

| Status | `code`                       | Kiedy                                                                |
| ------ | ---------------------------- | -------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`           | Błędne dane wejściowe, także data przyjazdu w przeszłości            |
| 401    | `UNAUTHORIZED`               | Brak lub zły klucz API w `/integrations/*`                           |
| 404    | `ROOM_NOT_FOUND`             | Pokój nie istnieje albo jest wyłączony z oferty                      |
| 404    | `PACKAGE_NOT_FOUND`          | Pakiet nie istnieje albo jest nieaktywny                             |
| 404    | `BOOKING_NOT_FOUND`          | Brak rezerwacji o tym kodzie (przy anulacji: brak pary kod + e-mail) |
| 404    | `NOT_FOUND`                  | Nieznana ścieżka                                                     |
| 409    | `ROOM_NOT_AVAILABLE`         | Pokój jest już zarezerwowany w wybranym terminie                     |
| 409    | `BOOKING_ALREADY_CANCELLED`  | Rezerwacja została już anulowana                                     |
| 422    | `GUESTS_EXCEED_CAPACITY`     | Liczba gości przekracza pojemność pokoju                             |
| 422    | `CANCELLATION_NOT_ALLOWED`   | Pobyt już się rozpoczął                                              |
| 429    | `TOO_MANY_REQUESTS`          | Przekroczony limit żądań z jednego adresu (patrz „Limity żądań")     |
| 500    | `INTERNAL_ERROR`             | Nieoczekiwany błąd serwera                                           |
| 501    | `NOT_IMPLEMENTED`            | Endpoint z kontraktu bez implementacji (tymczasowo)                  |
| 503    | `SERVICE_UNAVAILABLE`        | Baza danych jest niedostępna                                         |

## 3. Endpointy

### 3.1 `GET /rooms` – wyszukiwanie pokoi

Zwraca pokoje oferowane przez hotel. Z datami zwraca także liczbę nocy, koszt pobytu i dostępność.

| Parametr        | Typ      | Wymagany | Opis                                                                  |
| --------------- | -------- | -------- | --------------------------------------------------------------------- |
| `checkIn`       | data     | z `checkOut` | Data przyjazdu, nie z przeszłości                                 |
| `checkOut`      | data     | z `checkIn`  | Data wyjazdu, późniejsza niż `checkIn`                            |
| `guests`        | liczba całkowita 1–20 | nie | Zwraca pokoje z `capacity >= guests`                       |
| `minPrice`      | liczba ≥ 0 | nie    | Minimalna cena za noc                                                 |
| `maxPrice`      | liczba ≥ 0 | nie    | Maksymalna cena za noc, nie mniejsza niż `minPrice`                   |
| `onlyAvailable` | `true`/`false` | nie | Domyślnie `true`, gdy podano daty. `false` zwraca też zajęte pokoje ze statusem `OCCUPIED`. Bez dat jest ignorowany |

Daty podaje się razem albo wcale. Pokoje wyłączone z oferty (`isActive = false`) nigdy nie są zwracane.

Przykład: `GET /api/v1/rooms?checkIn=2026-11-15&checkOut=2026-11-18&guests=2`

```json
{
  "meta": {
    "checkIn": "2026-11-15",
    "checkOut": "2026-11-18",
    "nightsCount": 3,
    "guests": 2,
    "totalResults": 1
  },
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      "roomNumber": "101",
      "name": "Pokój Standard Dwuosobowy",
      "shortDescription": "Komfortowy pokój z widokiem na ogród i dużym łóżkiem małżeńskim.",
      "pricePerNight": 350,
      "totalStayPrice": 1050,
      "capacity": 2,
      "imageUrl": "https://images.unsplash.com/photo-1611892440504-42a792e24d32",
      "amenities": ["WiFi", "TV", "Klimatyzacja", "Łazienka"],
      "status": "AVAILABLE",
      "isAvailable": true
    }
  ]
}
```

- `status` to `AVAILABLE` albo `OCCUPIED`. `isAvailable` jest skrótem równym `status === "AVAILABLE"`.
- Bez dat `status`, `isAvailable`, `totalStayPrice`, `nightsCount`, `checkIn` i `checkOut` mają wartość `null`.
- `shortDescription` to skrócony do 160 znaków `description`.
- `totalStayPrice` obejmuje tylko pokój (`nightsCount * pricePerNight`), bez pakietu.

Błędy: `400 VALIDATION_ERROR`.

### 3.2 `GET /rooms/{id}` – szczegóły pokoju

Parametry zapytania: `checkIn` i `checkOut` (opcjonalne, tak jak wyżej).

```json
{
  "id": "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
  "roomNumber": "101",
  "name": "Pokój Standard Dwuosobowy",
  "description": "Przestronny pokój z widokiem na ogród, dużym łóżkiem małżeńskim i własną łazienką.",
  "pricePerNight": 350,
  "capacity": 2,
  "imageUrl": "https://images.unsplash.com/photo-1611892440504-42a792e24d32",
  "amenities": ["WiFi", "TV", "Klimatyzacja", "Łazienka"],
  "nightsCount": 3,
  "totalStayPrice": 1050,
  "status": "AVAILABLE",
  "isAvailable": true,
  "availablePackages": [
    {
      "id": "3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11",
      "name": "Pakiet Relaks SPA",
      "description": "Masaż relaksacyjny oraz dostęp do strefy SPA.",
      "priceModifier": 250,
      "billingType": "ONCE",
      "includedServices": ["MASSAGE_RELAX_60", "SPA_ACCESS"],
      "priceForStay": 250
    }
  ]
}
```

- `availablePackages` zawiera wszystkie aktywne pakiety, bo pakiety nie są przypisane do pokoi.
- `priceForStay` to dopłata za cały pobyt (dla `ONCE` równa `priceModifier`, dla `PER_NIGHT` pomnożona
  przez liczbę nocy). Bez dat ma wartość `null`.
- Zdjęcie: na razie jedno (`imageUrl`). Galeria wymaga zmiany modelu danych.

Błędy: `400 VALIDATION_ERROR` (identyfikator nie jest UUID, błędne daty), `404 ROOM_NOT_FOUND`.

### 3.3 `GET /packages` – pakiety wypoczynkowe

```json
{
  "data": [
    {
      "id": "3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11",
      "name": "Pakiet Relaks SPA",
      "description": "Masaż relaksacyjny oraz dostęp do strefy SPA.",
      "priceModifier": 250,
      "billingType": "ONCE",
      "includedServices": ["MASSAGE_RELAX_60", "SPA_ACCESS"]
    }
  ]
}
```

`billingType`: `ONCE` (dopłata jednorazowa) lub `PER_NIGHT` (za każdą noc).

### 3.4 `POST /bookings` – utworzenie rezerwacji

```json
{
  "roomId": "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
  "packageId": "3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11",
  "checkIn": "2026-11-15",
  "checkOut": "2026-11-18",
  "guestsCount": 2,
  "guestDetails": {
    "firstName": "Jan",
    "lastName": "Kowalski",
    "email": "jan.kowalski@example.com",
    "phone": "+48123456789"
  },
  "voucherCode": "JESIEN2026"
}
```

| Pole               | Wymagane | Reguły                                                                 |
| ------------------ | -------- | ---------------------------------------------------------------------- |
| `roomId`           | tak      | UUID aktywnego pokoju                                                  |
| `packageId`        | nie      | UUID aktywnego pakietu; pominięte lub `null` oznacza brak pakietu      |
| `checkIn`          | tak      | data, nie z przeszłości                                                |
| `checkOut`         | tak      | data późniejsza niż `checkIn`                                          |
| `guestsCount`      | tak      | liczba całkowita 1–20, nie większa niż pojemność pokoju                |
| `guestDetails`     | tak      | `firstName`, `lastName` (do 100 znaków), `email` (do 254 znaków), `phone` |
| `phone`            | tak      | cyfry z opcjonalnym `+` na początku, dozwolone spacje i myślniki, 7–20 znaków |
| `voucherCode`      | nie      | litery, cyfry, `-` i `_`, do 50 znaków                                 |

Odpowiedź `201 Created`:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "bookingCode": "HTL-2026-X89B",
  "status": "CONFIRMED",
  "room": {
    "id": "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
    "name": "Pokój Standard Dwuosobowy",
    "roomNumber": "101"
  },
  "package": { "id": "3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11", "name": "Pakiet Relaks SPA" },
  "checkIn": "2026-11-15",
  "checkOut": "2026-11-18",
  "nightsCount": 3,
  "guestsCount": 2,
  "totalPrice": 1300,
  "guestDetails": {
    "firstName": "Jan",
    "lastName": "Kowalski",
    "email": "jan.kowalski@example.com",
    "phone": "+48123456789"
  },
  "voucherCode": "JESIEN2026",
  "createdAt": "2026-11-08T15:30:00.000Z",
  "cancelledAt": null,
  "cancelReason": null
}
```

Cenę zawsze liczy serwer: `nightsCount * pricePerNight` plus dopłata za pakiet
(zasady w `architecture.md`, reguła BR-3). W przykładzie 3 × 350 + 250 = 1300.
Klient nie wysyła ceny, a próba jej podania kończy się błędem `400`.

Błędy: `400 VALIDATION_ERROR`, `404 ROOM_NOT_FOUND` / `PACKAGE_NOT_FOUND`,
`409 ROOM_NOT_AVAILABLE`, `422 GUESTS_EXCEED_CAPACITY`.

### 3.5 `POST /bookings/cancel` – anulacja rezerwacji

Gość nie ma konta, więc identyfikuje rezerwację kodem i adresem e-mail podanym przy rezerwacji.

```json
{
  "bookingCode": "HTL-2026-X89B",
  "email": "jan.kowalski@example.com",
  "reason": "Zmiana planów wyjazdowych"
}
```

Odpowiedź `200 OK` to ta sama struktura co przy tworzeniu, ze `status: "CANCELLED"`,
wypełnionymi `cancelledAt` i `cancelReason`. Termin pokoju wraca do wyszukiwarki.

- Adres e-mail jest porównywany bez rozróżniania wielkości liter.
- Zły kod i zły e-mail dają **tę samą** odpowiedź `404 BOOKING_NOT_FOUND`, aby nie dało się
  sprawdzać, czy dany kod istnieje.
- Anulacja jest możliwa do dnia poprzedzającego przyjazd. Później `422 CANCELLATION_NOT_ALLOWED`.
- Ponowna anulacja tej samej rezerwacji daje `409 BOOKING_ALREADY_CANCELLED`.

Wybrano `POST /bookings/cancel`, a nie `PATCH /bookings/{kod}/cancel`, bo anulacja wymaga
adresu e-mail, a dane osobowe nie powinny trafiać do adresu URL (zapisują się w logach serwerów).

### 3.6 `GET /integrations/bookings/{bookingCode}/verification` – weryfikacja pobytu

Dla zespołów A i B. Wymaga nagłówka `X-API-Key`. Parametr zapytania `date` (opcjonalny, domyślnie dzisiaj
w strefie `Europe/Warsaw`) wskazuje dzień, dla którego sprawdzamy pobyt.

`GET /api/v1/integrations/bookings/HTL-2026-X89B/verification?date=2026-11-16`

```json
{
  "bookingCode": "HTL-2026-X89B",
  "status": "CONFIRMED",
  "date": "2026-11-16",
  "isActive": true,
  "checkIn": "2026-11-15",
  "checkOut": "2026-11-18",
  "guestsCount": 2,
  "package": {
    "id": "3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11",
    "name": "Pakiet Relaks SPA",
    "includedServices": ["MASSAGE_RELAX_60", "SPA_ACCESS"]
  }
}
```

- `isActive` jest prawdą, gdy rezerwacja ma status `CONFIRMED` oraz `checkIn <= date <= checkOut`.
  Dzień wyjazdu nadal się liczy (np. poranny masaż).
- Anulowana rezerwacja daje `200` z `isActive: false` i `status: "CANCELLED"`, a nie błąd.
- Odpowiedź nie zawiera danych osobowych gościa, bo jedynym zabezpieczeniem jest kod rezerwacji.
- `package` ma wartość `null`, gdy do rezerwacji nie wybrano pakietu.

Błędy: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 BOOKING_NOT_FOUND`.

## 4. Mapowanie na obecny frontend (HOTEL-7)

Prototyp Pawła używa lokalnych danych `Room { id, name, capacity, pricePerNight }`
i sam liczy noce oraz cenę. Po podłączeniu API:

| Obecnie we froncie                         | Po podłączeniu API                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `id: number`                               | `id: string` (UUID)                                                      |
| `name`, `capacity`, `pricePerNight`        | bez zmian                                                                |
| liczba nocy liczona w przeglądarce         | `meta.nightsCount` z odpowiedzi                                          |
| `pricePerNight * nights`                   | `totalStayPrice` z odpowiedzi (cena z serwera jest wiążąca)              |
| filtr `capacity >= guests` w przeglądarce  | parametr `guests`                                                        |
| brak                                       | nowe pola: `roomNumber`, `shortDescription`, `imageUrl`, `amenities`, `status` |
| komunikaty walidacji w komponencie         | zostają, ale serwer waliduje te same reguły i zwraca `details[]`         |

Typy TypeScript można wygenerować z `docs/openapi.json`, np.:

```bash
npx openapi-typescript docs/openapi.json -o frontend/src/api/types.ts
```

Dane demonstracyjne w HOTEL-6 będą zawierały trzy pokoje z obecnego mocka
(jednoosobowy 220 zł, dwuosobowy 320 zł, apartament rodzinny 550 zł), żeby ekran wyglądał tak samo.

## 5. Integracje z zespołami

| Zespół            | Co otrzymuje od nas                                           | Co musimy uzgodnić                                                     |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| A – masaże        | endpoint weryfikacji pobytu (3.6), kody usług w pakietach     | klucz API, lista kodów usług (np. `MASSAGE_RELAX_60`)                  |
| B – fitness       | endpoint weryfikacji pobytu (3.6), kody usług w pakietach     | klucz API, lista kodów usług (np. `FITNESS_DAY_PASS`)                  |
| D – vouchery      | pole `voucherCode` zapisywane przy rezerwacji                 | czy walidują kod po swojej stronie i jaka zniżka z niego wynika        |

Kody w `includedServices` mają format `UPPER_SNAKE_CASE` i są stałe, bo partnerzy rozpoznają po nich
usługę. Zmiana kodu wymaga uzgodnienia z zespołem.

## 6. Założenia i decyzje do akceptacji

Wszystkie poniższe punkty to propozycje. Zostają w kontrakcie, dopóki nikt nie zgłosi sprzeciwu.

| #  | Temat                         | Propozycja                                                                          | Kto potwierdza     |
| -- | ----------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| 1  | Format kwot                   | `number` z dwoma miejscami po przecinku (nie tekst)                                 | Paweł              |
| 2  | Semantyka `voucherCode`       | W MVP tylko zapisywany. Zniżka dopiero po ustaleniach z zespołem D                  | Zespół D           |
| 3  | Autoryzacja integracji        | Klucz w nagłówku `X-API-Key`, osobny dla każdego zespołu                            | Zespoły A, B       |
| 4  | Status `COMPLETED`            | Zostaje w modelu, ale żaden proces go jeszcze nie ustawia. Do usunięcia lub wyliczania z dat | Zespół projektowy |
| 5  | Zasady anulacji               | Do dnia poprzedzającego przyjazd, bez opłat                                         | Zespół projektowy  |
| 6  | Pakiety a pokoje              | Pakiety są globalne, dostępne dla każdego pokoju                                    | Paweł              |
| 7  | Pole `isAvailable`            | Zostaje obok `status` dla wygody frontendu, choć jest z niego wyliczane             | Paweł              |
| 8  | Ścieżka weryfikacji pobytu    | Pod `/integrations/...`, a nie `/bookings/verify/...`, aby klucz API obejmował tylko integracje | Zespoły A, B |
| 9  | Cena pakietu a liczba gości   | Dopłata nie zależy od liczby gości                                                  | Zespół projektowy  |
| 10 | Limit żądań                   | Wdrożony: anulacja 5/min, integracje 60/min, reszta 120/min na adres IP (ochrona przed zgadywaniem kodów) | Zespół projektowy |
| 11 | Galeria zdjęć                 | Poza zakresem v1: model ma jedno zdjęcie                                            | Paweł              |
| 12 | Telefon                       | Dowolny numer w formacie z sekcji 3.4, bez wymuszania `+48`                         | Paweł              |

## 7. Proces zmian i akceptacji

1. Zmiana kontraktu to zmiana w kodzie DTO i kontrolerów. Po niej uruchamiamy `npm run openapi:update`
   w katalogu `backend/`, co odświeża `docs/openapi.json`.
2. Test `test/openapi.e2e-spec.ts` w CI zawodzi, jeśli kod i `docs/openapi.json` się rozjadą,
   więc plik nie może zostać nieaktualny.
3. Zmiana trafia do `main` przez Pull Request. Zmiany niekompatybilne wymagają zgody osób z listy poniżej.

| Osoba / zespół          | Zakres akceptacji                                  | Status    |
| ----------------------- | -------------------------------------------------- | --------- |
| Paweł (frontend)        | sekcje 3.1–3.5, 4 oraz decyzje 1, 6, 7, 11, 12      | oczekuje  |
| Zespół A (masaże)       | sekcje 3.6, 5 oraz decyzje 3, 8                    | oczekuje  |
| Zespół B (fitness)      | sekcje 3.6, 5 oraz decyzje 3, 8                    | oczekuje  |
| Zespół D (vouchery)     | sekcja 5 oraz decyzja 2                            | oczekuje  |
| Testerzy                | sekcje 2 i 3 (kody błędów, przypadki brzegowe)     | oczekuje  |
