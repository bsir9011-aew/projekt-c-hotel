
/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'

import App from './App'

// Usuwamy poprzedni interfejs po każdym teście.
afterEach(() => {
  cleanup()
})

function fillSearchForm(
  arrival: string,
  departure: string,
  guests = '2'
) {
  fireEvent.change(screen.getByLabelText('Data przyjazdu'), {
    target: { value: arrival },
  })

  fireEvent.change(screen.getByLabelText('Data wyjazdu'), {
    target: { value: departure },
  })

  fireEvent.change(screen.getByLabelText('Liczba gości'), {
    target: { value: guests },
  })
}

function searchRooms() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Szukaj pokoi' })
  )
}

describe('HOTEL-7 - Wyszukiwarka pokoi', () => {

  it('pokazuje błąd, gdy nie wybrano dat', () => {
    render(<App />)

    searchRooms()

    expect(
      screen.getByText('Wybierz datę przyjazdu i wyjazdu.')
    ).toBeTruthy()
  })

  it('odrzuca datę wyjazdu wcześniejszą niż przyjazd', () => {
    render(<App />)

    fillSearchForm('2026-11-18', '2026-11-15')
    searchRooms()

    expect(
      screen.getByText(
        'Data wyjazdu musi być późniejsza niż data przyjazdu.'
      )
    ).toBeTruthy()
  })

  it('oblicza cenę za trzy noclegi dla dwóch gości', () => {
    render(<App />)

    fillSearchForm('2026-11-15', '2026-11-18', '2')
    searchRooms()

    expect(screen.getByText('Łącznie: 960 zł')).toBeTruthy()
    expect(screen.getByText('Łącznie: 1650 zł')).toBeTruthy()

    // Pokój jednoosobowy nie pasuje do dwóch gości.
    expect(screen.queryByText('Łącznie: 660 zł')).toBeNull()
  })

  it('pokazuje brak pokoi dla pięciu gości', () => {
    render(<App />)

    fillSearchForm('2026-11-15', '2026-11-18', '5')
    searchRooms()

    expect(
      screen.getByText('Brak pokoi dla wybranej liczby gości.')
    ).toBeTruthy()
  })

  it('ukrywa stare wyniki po zmianie daty', () => {
    render(<App />)

    fillSearchForm('2026-11-15', '2026-11-18', '2')
    searchRooms()

    expect(screen.getByText('Łącznie: 960 zł')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Data przyjazdu'), {
      target: { value: '2026-11-16' },
    })

    expect(screen.queryByText('Łącznie: 960 zł')).toBeNull()
  })

  it('odrzuca nieprawidłową liczbę gości', () => {
    render(<App />)

    fillSearchForm('2026-11-15', '2026-11-18', '0')
    searchRooms()

    expect(
      screen.getByText('Podaj poprawną liczbę gości.')
    ).toBeTruthy()
  })

})
