type TransformParams = { value: unknown };

// Usuwa białe znaki z początku i końca tekstu. Wartości innych typów zostawia bez zmian do walidacji. (DamianTchorzewski_72206)
export function trim({ value }: TransformParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// Normalizuje wpisany ręcznie kod (np. rezerwacji), aby wielkość liter nie miała znaczenia. (DamianTchorzewski_72206)
export function trimAndUpperCase({ value }: TransformParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
