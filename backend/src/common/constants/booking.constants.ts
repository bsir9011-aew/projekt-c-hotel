// Maksymalna liczba gości w jednej rezerwacji. Ogranicza dane wejściowe niezależnie od pojemności pokoju. (DamianTchorzewski_72206)
export const MAX_GUESTS_PER_BOOKING = 20;

// Kod rezerwacji: HTL-<rok>-<4 znaki>. Alfabet pomija łatwe do pomylenia znaki: I, L, O, 0 i 1. (DamianTchorzewski_72206)
export const BOOKING_CODE_PATTERN = /^HTL-\d{4}-[A-HJKMNP-Z2-9]{4}$/;
export const BOOKING_CODE_EXAMPLE = 'HTL-2026-X89B';
