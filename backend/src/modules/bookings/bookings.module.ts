import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [RoomsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
