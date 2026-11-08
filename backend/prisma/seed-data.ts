import {
  addDays,
  parseDateOnly,
  todayInHotel,
} from '../src/common/dates/date-utils.js';
import { calculateTotalPrice } from '../src/common/pricing/stay-pricing.js';
import type {
  PackageBillingType,
  PrismaClient,
} from '../src/generated/prisma/client.js';

interface RoomSeed {
  id: string;
  roomNumber: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  imageUrl: string;
  amenities: string[];
  isActive: boolean;
}

interface PackageSeed {
  id: string;
  name: string;
  description: string;
  priceModifier: number;
  billingType: PackageBillingType;
  includedServices: string[];
  isActive: boolean;
}

interface DemoBookingSeed {
  bookingCode: string;
  roomNumber: string;
  // Przesunięcie dnia przyjazdu względem dnia uruchomienia seeda, aby dane demo zawsze były aktualne. (DamianTchorzewski_72206)
  startOffsetDays: number;
  nights: number;
  guestsCount: number;
  packageId: string | null;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
}

export interface SeedSummary {
  rooms: number;
  packages: number;
  bookings: number;
}

// Stałe identyfikatory sprawiają, że seed jest powtarzalny, a przykłady z dokumentacji działają na zasianej bazie. (DamianTchorzewski_72206)
const roomId = (number: string): string =>
  `00000000-0000-4000-8000-${number.padStart(12, '0')}`;
const packageId = (number: number): string =>
  `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

const picture = (number: string): string =>
  `https://picsum.photos/seed/hotel-c-${number}/800/600`;

export const SPA_PACKAGE_ID = '3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11';
export const FITNESS_PACKAGE_ID = packageId(2);
export const ALL_INCLUSIVE_PACKAGE_ID = packageId(3);
export const EXAMPLE_ROOM_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

// Trzy pierwsze pokoje odpowiadają danym z prototypu frontendu (jednoosobowy, dwuosobowy, apartament rodzinny). (DamianTchorzewski_72206)
export const DEMO_ROOMS: RoomSeed[] = [
  {
    id: EXAMPLE_ROOM_ID,
    roomNumber: '101',
    name: 'Pokój Standard Dwuosobowy',
    description:
      'Przestronny pokój z widokiem na ogród, dużym łóżkiem małżeńskim i własną łazienką. Idealny na romantyczny wypad lub krótki wypoczynek we dwoje.',
    pricePerNight: 350,
    capacity: 2,
    imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32',
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka'],
    isActive: true,
  },
  {
    id: roomId('102'),
    roomNumber: '102',
    name: 'Pokój jednoosobowy',
    description:
      'Kompaktowy, cichy pokój dla jednej osoby z wygodnym łóżkiem, biurkiem do pracy i łazienką.',
    pricePerNight: 220,
    capacity: 1,
    imageUrl: picture('102'),
    amenities: ['WiFi', 'TV', 'Łazienka', 'Biurko'],
    isActive: true,
  },
  {
    id: roomId('103'),
    roomNumber: '103',
    name: 'Pokój dwuosobowy',
    description:
      'Jasny pokój z dwoma osobnymi łóżkami lub jednym podwójnym, na życzenie gościa.',
    pricePerNight: 320,
    capacity: 2,
    imageUrl: picture('103'),
    amenities: ['WiFi', 'TV', 'Łazienka'],
    isActive: true,
  },
  {
    id: roomId('201'),
    roomNumber: '201',
    name: 'Apartament rodzinny',
    description:
      'Dwupokojowy apartament dla rodziny z małym aneksem kuchennym, salonem i osobną sypialnią.',
    pricePerNight: 550,
    capacity: 4,
    imageUrl: picture('201'),
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka', 'Aneks kuchenny'],
    isActive: true,
  },
  {
    id: roomId('104'),
    roomNumber: '104',
    name: 'Pokój Superior Dwuosobowy',
    description:
      'Rozszerzona wersja pokoju standard z większym metrażem, minibarem i strefą wypoczynkową.',
    pricePerNight: 420,
    capacity: 2,
    imageUrl: picture('104'),
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka', 'Minibar'],
    isActive: true,
  },
  {
    id: roomId('105'),
    roomNumber: '105',
    name: 'Pokój Trzyosobowy',
    description:
      'Pokój z podwójnym łóżkiem i dodatkowym łóżkiem pojedynczym, dobry dla trzech osób.',
    pricePerNight: 400,
    capacity: 3,
    imageUrl: picture('105'),
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka'],
    isActive: true,
  },
  {
    id: roomId('202'),
    roomNumber: '202',
    name: 'Apartament Deluxe',
    description:
      'Luksusowy apartament z balkonem, wanną z hydromasażem i widokiem na park.',
    pricePerNight: 780,
    capacity: 2,
    imageUrl: picture('202'),
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka', 'Wanna', 'Balkon'],
    isActive: true,
  },
  {
    id: roomId('203'),
    roomNumber: '203',
    name: 'Apartament Rodzinny Premium',
    description:
      'Duży apartament z dwiema sypialniami, salonem i aneksem kuchennym dla rodzin do pięciu osób.',
    pricePerNight: 690,
    capacity: 5,
    imageUrl: picture('203'),
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka', 'Aneks kuchenny'],
    isActive: true,
  },
  {
    id: roomId('204'),
    roomNumber: '204',
    name: 'Pokój Komfort z Balkonem',
    description:
      'Przytulny pokój z własnym balkonem, na którym można zjeść śniadanie.',
    pricePerNight: 380,
    capacity: 2,
    imageUrl: picture('204'),
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka', 'Balkon'],
    isActive: true,
  },
  {
    id: roomId('301'),
    roomNumber: '301',
    name: 'Apartament Prezydencki',
    description:
      'Najbardziej reprezentacyjny apartament hotelu z tarasem, jacuzzi i prywatnym wejściem.',
    pricePerNight: 1200,
    capacity: 4,
    imageUrl: picture('301'),
    amenities: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka', 'Taras', 'Jacuzzi'],
    isActive: true,
  },
  // Pokój wyłączony z oferty: służy do sprawdzenia, że wyszukiwarka go pomija. (DamianTchorzewski_72206)
  {
    id: roomId('999'),
    roomNumber: '999',
    name: 'Pokój w remoncie',
    description: 'Pokój chwilowo niedostępny z powodu remontu.',
    pricePerNight: 300,
    capacity: 2,
    imageUrl: picture('999'),
    amenities: ['WiFi', 'Łazienka'],
    isActive: false,
  },
];

// Kody usług w includedServices są stałe, bo zespoły masaży i fitnessu rozpoznają po nich usługę. (DamianTchorzewski_72206)
export const DEMO_PACKAGES: PackageSeed[] = [
  {
    id: SPA_PACKAGE_ID,
    name: 'Pakiet Relaks SPA',
    description: 'Masaż relaksacyjny oraz dostęp do strefy SPA.',
    priceModifier: 250,
    billingType: 'ONCE',
    includedServices: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
    isActive: true,
  },
  {
    id: FITNESS_PACKAGE_ID,
    name: 'Pakiet Aktywny Fitness',
    description:
      'Codzienny wstęp na siłownię i konsultacja z trenerem personalnym.',
    priceModifier: 80,
    billingType: 'PER_NIGHT',
    includedServices: ['FITNESS_DAY_PASS', 'FITNESS_TRAINER_30'],
    isActive: true,
  },
  {
    id: ALL_INCLUSIVE_PACKAGE_ID,
    name: 'Pakiet All-Inclusive',
    description:
      'Wyżywienie przez cały pobyt oraz codzienny dostęp do SPA i siłowni.',
    priceModifier: 150,
    billingType: 'PER_NIGHT',
    includedServices: ['MEALS_ALL_INCLUSIVE', 'SPA_ACCESS', 'FITNESS_DAY_PASS'],
    isActive: true,
  },
  // Pakiet wyłączony z oferty: służy do sprawdzenia, że lista pakietów go pomija. (DamianTchorzewski_72206)
  {
    id: packageId(4),
    name: 'Pakiet Romantyczny Weekend',
    description: 'Masaż dla dwojga i kolacja przy świecach.',
    priceModifier: 300,
    billingType: 'ONCE',
    includedServices: ['MASSAGE_COUPLE_60'],
    isActive: false,
  },
];

// Rezerwacje demonstracyjne pozwalają od razu sprawdzić zajęte pokoje, anulację i weryfikację pobytu. (DamianTchorzewski_72206)
export const DEMO_BOOKINGS: DemoBookingSeed[] = [
  {
    bookingCode: 'HTL-2026-DM2A',
    roomNumber: '103',
    startOffsetDays: 14,
    nights: 3,
    guestsCount: 2,
    packageId: null,
    guestFirstName: 'Anna',
    guestLastName: 'Demo',
    guestEmail: 'anna.demo@example.com',
    guestPhone: '+48500100200',
  },
  {
    bookingCode: 'HTL-2026-DM3B',
    roomNumber: '202',
    startOffsetDays: 20,
    nights: 4,
    guestsCount: 2,
    packageId: ALL_INCLUSIVE_PACKAGE_ID,
    guestFirstName: 'Piotr',
    guestLastName: 'Demo',
    guestEmail: 'piotr.demo@example.com',
    guestPhone: '+48500100300',
  },
  // Pobyt, który już trwa: weryfikacja pobytu zwraca isActive, a anulacja jest niedozwolona. (DamianTchorzewski_72206)
  {
    bookingCode: 'HTL-2026-DM4C',
    roomNumber: '105',
    startOffsetDays: -1,
    nights: 4,
    guestsCount: 3,
    packageId: FITNESS_PACKAGE_ID,
    guestFirstName: 'Ewa',
    guestLastName: 'Demo',
    guestEmail: 'ewa.demo@example.com',
    guestPhone: '+48500100400',
  },
];

// Zasiewa bazę danymi demonstracyjnymi. Można uruchamiać wielokrotnie, bo dane są dopisywane przez upsert. (DamianTchorzewski_72206)
export async function seedDatabase(
  prisma: PrismaClient,
  today: string = todayInHotel(),
): Promise<SeedSummary> {
  for (const { id, roomNumber, ...fields } of DEMO_ROOMS) {
    await prisma.room.upsert({
      where: { roomNumber },
      create: { id, roomNumber, ...fields },
      update: fields,
    });
  }

  for (const { id, ...fields } of DEMO_PACKAGES) {
    await prisma.package.upsert({
      where: { id },
      create: { id, ...fields },
      update: fields,
    });
  }

  for (const demo of DEMO_BOOKINGS) {
    const room = await prisma.room.findUniqueOrThrow({
      where: { roomNumber: demo.roomNumber },
    });
    const pkg = DEMO_PACKAGES.find((item) => item.id === demo.packageId);

    const checkIn = addDays(today, demo.startOffsetDays);
    const checkOut = addDays(checkIn, demo.nights);
    const fields = {
      roomId: room.id,
      packageId: pkg?.id ?? null,
      checkIn: parseDateOnly(checkIn),
      checkOut: parseDateOnly(checkOut),
      guestsCount: demo.guestsCount,
      nightsCount: demo.nights,
      totalPrice: calculateTotalPrice(
        room.pricePerNight,
        demo.nights,
        pkg ?? null,
      ),
      status: 'CONFIRMED' as const,
      guestFirstName: demo.guestFirstName,
      guestLastName: demo.guestLastName,
      guestEmail: demo.guestEmail,
      guestPhone: demo.guestPhone,
      cancelledAt: null,
      cancelReason: null,
    };

    await prisma.booking.upsert({
      where: { bookingCode: demo.bookingCode },
      create: { bookingCode: demo.bookingCode, ...fields },
      update: fields,
    });
  }

  return {
    rooms: DEMO_ROOMS.length,
    packages: DEMO_PACKAGES.length,
    bookings: DEMO_BOOKINGS.length,
  };
}
