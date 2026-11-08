import { Prisma } from '../../generated/prisma/client.js';

// Szczegóły błędu bazy Prisma układa w meta inaczej poza transakcją (meta.code) i w transakcji interaktywnej
// (meta.driverAdapterError.cause.code). Dlatego sprawdzamy całe meta, a nie konkretną ścieżkę. (DamianTchorzewski_72206)
function metaOf(error: Prisma.PrismaClientKnownRequestError): string {
  return JSON.stringify(error.meta ?? {});
}

// Prisma 7 zgłasza naruszenie constraintu EXCLUDE z PostgreSQL jako P2039 z oryginalnym kodem 23P01.
// Rozpoznajemy je po kodach i nazwie constraintu, a nie po tekście komunikatu. (DamianTchorzewski_72206)
export function isExclusionViolation(
  error: unknown,
  constraint: string,
): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2039'
  ) {
    return false;
  }

  const meta = metaOf(error);
  return meta.includes('23P01') && meta.includes(constraint);
}

// Naruszenie unikalności (P2002) dla konkretnego constraintu, np. powtórzony kod rezerwacji. (DamianTchorzewski_72206)
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    metaOf(error).includes(constraint)
  );
}
