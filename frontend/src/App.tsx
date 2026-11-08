
import { useState } from 'react'
import './App.css'

type Room = {
  id: number
  name: string
  capacity: number
  pricePerNight: number
}

const mockRooms: Room[] = [
  {
    id: 1,
    name: 'Pokój jednoosobowy',
    capacity: 1,
    pricePerNight: 220,
  },
  {
    id: 2,
    name: 'Pokój dwuosobowy',
    capacity: 2,
    pricePerNight: 320,
  },
  {
    id: 3,
    name: 'Apartament rodzinny',
    capacity: 4,
    pricePerNight: 550,
  },
]

const MS_PER_DAY = 24 * 60 * 60 * 1000

function calculateNights(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0

  const start = Date.parse(`${arrival}T00:00:00Z`)
  const end = Date.parse(`${departure}T00:00:00Z`)

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0

  return Math.max(0, (end - start) / MS_PER_DAY)
}

function App() {
  const [arrival, setArrival] = useState('')
  const [departure, setDeparture] = useState('')
  const [guests, setGuests] = useState(2)
  const [message, setMessage] = useState('')
  const [showResults, setShowResults] = useState(false)

  const nights = calculateNights(arrival, departure)

  const filteredRooms = mockRooms.filter(
    (room) => room.capacity >= guests
  )

  function resetResults() {
    setMessage('')
    setShowResults(false)
  }

  function searchRooms() {
    setShowResults(false)

    if (!arrival || !departure) {
      setMessage('Wybierz datę przyjazdu i wyjazdu.')
      return
    }

    if (nights <= 0) {
      setMessage('Data wyjazdu musi być późniejsza niż data przyjazdu.')
      return
    }

    if (!Number.isInteger(guests) || guests < 1) {
      setMessage('Podaj poprawną liczbę gości.')
      return
    }

    setMessage(
      `Wyszukiwanie zakończone. Liczba noclegów: ${nights}`
    )
    setShowResults(true)
  }

  return (
    <main>
      <h1>Hotel C</h1>
      <h2>Znajdź pokój na swój pobyt</h2>

      <div className="search-form">
        <label>
          Data przyjazdu
          <input
            type="date"
            value={arrival}
            onChange={(e) => {
              setArrival(e.target.value)
              resetResults()
            }}
          />
        </label>

        <label>
          Data wyjazdu
          <input
            type="date"
            value={departure}
            min={arrival || undefined}
            onChange={(e) => {
              setDeparture(e.target.value)
              resetResults()
            }}
          />
        </label>

        <label>
          Liczba gości
          <input
            type="number"
            min="1"
            step="1"
            value={guests}
            onChange={(e) => {
              setGuests(Number(e.target.value))
              resetResults()
            }}
          />
        </label>

        <button type="button" onClick={searchRooms}>
          Szukaj pokoi
        </button>
      </div>

      {message && (
        <p
          className={showResults ? 'success-message' : 'error-message'}
          role="status"
        >
          {message}
        </p>
      )}

      {showResults && (
        <section className="results">
          <h3>Dostępne pokoje - demonstracja</h3>

          <p className="results-description">
            Wyniki demonstracyjne. Rzeczywista dostępność
            w wybranym terminie nie jest jeszcze sprawdzana.
          </p>

          <p className="nights-info">
            Liczba noclegów: <strong>{nights}</strong>
          </p>

          <p>
            Liczba gości: <strong>{guests}</strong>
          </p>

          {filteredRooms.length === 0 ? (
            <p className="error-message">
              Brak pokoi dla wybranej liczby gości.
            </p>
          ) : (
            <div className="rooms-list">
              {filteredRooms.map((room) => (
                <article className="room-card" key={room.id}>
                  <h4>{room.name}</h4>

                  <p>Maksymalnie {room.capacity} osób</p>

                  <p className="night-price">
                    {room.pricePerNight} zł / noc
                  </p>

                  <strong className="total-price">
                    Łącznie: {room.pricePerNight * nights} zł
                  </strong>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export default App
