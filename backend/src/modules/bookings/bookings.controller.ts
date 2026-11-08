import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { BookingsService } from './bookings.service.js';
import { BookingDto } from './dto/booking.dto.js';
import { CancelBookingDto } from './dto/cancel-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a booking',
    description:
      'Books a room for the given dates. The price is calculated by the server: nights * room price plus the package surcharge. The response contains the booking code that the guest uses to verify or cancel the booking.',
  })
  @ApiCreatedResponse({ type: BookingDto })
  @ApiErrorResponses({
    400: 'Invalid request body or dates in the past (VALIDATION_ERROR)',
    404: 'The room or the package does not exist or is not offered (ROOM_NOT_FOUND, PACKAGE_NOT_FOUND)',
    409: 'The room is already booked in the selected dates (ROOM_NOT_AVAILABLE)',
    422: 'The number of guests exceeds the capacity of the room (GUESTS_EXCEED_CAPACITY)',
  })
  create(@Body() dto: CreateBookingDto): Promise<BookingDto> {
    return this.bookingsService.create(dto);
  }

  // Anulacja jest akcją na istniejącej rezerwacji, ale gość identyfikuje ją kodem i e-mailem, a nie identyfikatorem. (DamianTchorzewski_72206)
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Cancels a booking identified by the pair: booking code and e-mail used when booking. The room becomes available again in the search. Cancellation is possible until the day before the arrival date.',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiErrorResponses({
    400: 'Invalid request body (VALIDATION_ERROR)',
    404: 'No booking matches the code and e-mail pair (BOOKING_NOT_FOUND). A wrong e-mail is not distinguished from a wrong code',
    409: 'The booking has already been cancelled (BOOKING_ALREADY_CANCELLED)',
    422: 'The stay has already started (CANCELLATION_NOT_ALLOWED)',
  })
  cancel(@Body() dto: CancelBookingDto): Promise<BookingDto> {
    return this.bookingsService.cancel(dto);
  }
}
