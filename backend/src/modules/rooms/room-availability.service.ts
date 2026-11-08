import { Injectable } from '@nestjs/common';
import { parseDateOnly } from '../../common/dates/date-utils.js';
import {
  BookingStatus as DbBookingStatus,
  type Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RoomAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // Zwraca pokoje zajęte w podanym terminie, zgodnie z regułą BR-1:
  // istniejące checkIn < nowe checkOut ORAZ istniejące checkOut > nowe checkIn.
  // Liczą się tylko potwierdzone rezerwacje, a dzień wyjazdu może być dniem przyjazdu kolejnego gościa. (DamianTchorzewski_72206)
  async findOccupiedRoomIds(
    roomIds: string[],
    checkIn: string,
    checkOut: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<Set<string>> {
    if (roomIds.length === 0) {
      return new Set();
    }

    const bookings = await client.booking.findMany({
      where: {
        roomId: { in: roomIds },
        status: DbBookingStatus.CONFIRMED,
        checkIn: { lt: parseDateOnly(checkOut) },
        checkOut: { gt: parseDateOnly(checkIn) },
      },
      select: { roomId: true },
      distinct: ['roomId'],
    });

    return new Set(bookings.map((booking) => booking.roomId));
  }
}
