import { Module } from '@nestjs/common';
import { PackagesModule } from '../packages/packages.module.js';
import { RoomAvailabilityService } from './room-availability.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [PackagesModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomAvailabilityService],
  exports: [RoomAvailabilityService],
})
export class RoomsModule {}
