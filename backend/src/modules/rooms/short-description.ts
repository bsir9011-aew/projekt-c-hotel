export const SHORT_DESCRIPTION_MAX_LENGTH = 160;

// Skrócony opis pokoju: baza ma tylko pełny opis, więc krótki wyliczamy. Tniemy po słowie i kończymy wielokropkiem. (DamianTchorzewski_72206)
export function toShortDescription(description: string): string {
  const text = description.replace(/\s+/g, ' ').trim();

  if (text.length <= SHORT_DESCRIPTION_MAX_LENGTH) {
    return text;
  }

  // Jeden znak zostaje na wielokropek, żeby wynik nigdy nie przekroczył limitu. (DamianTchorzewski_72206)
  const limited = text.slice(0, SHORT_DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = limited.lastIndexOf(' ');
  const wholeWords =
    lastSpace > SHORT_DESCRIPTION_MAX_LENGTH * 0.6
      ? limited.slice(0, lastSpace)
      : limited;

  return `${wholeWords.replace(/[\s.,;:!?-]+$/, '')}…`;
}
