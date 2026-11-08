// Typ opisujący sam kształt danych klasy DTO, bez jej tożsamości. Mappery zwracają zwykłe obiekty,
// więc rozwijanie ich operatorem spread jest bezpieczne i nie gubi żadnego prototypu. (DamianTchorzewski_72206)
export type Plain<T> = { [K in keyof T]: T[K] };
