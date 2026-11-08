import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { API_KEY_SECURITY_NAME } from '../../common/constants/api.constants.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { BookingCodeParamDto } from '../bookings/dto/booking-code-param.dto.js';
import { BookingVerificationDto } from './dto/booking-verification.dto.js';
import { VerifyBookingQueryDto } from './dto/verify-booking-query.dto.js';
import { IntegrationsService } from './integrations.service.js';

// Endpointy dla zespołów zewnętrznych mają osobny prefiks, dzięki czemu klucz API obejmuje tylko je. (DamianTchorzewski_72206)
@ApiTags('integrations')
@ApiSecurity(API_KEY_SECURITY_NAME)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('bookings/:bookingCode/verification')
  @ApiOperation({
    summary: 'Verify a guest stay',
    description:
      'Lets partner teams (massage, fitness) check whether the holder of a booking code has a stay in the hotel on a given day and which package services they are entitled to. Requires the X-API-Key header.',
  })
  @ApiOkResponse({ type: BookingVerificationDto })
  @ApiErrorResponses({
    400: 'Invalid booking code or date (VALIDATION_ERROR)',
    401: 'Missing or invalid API key (UNAUTHORIZED)',
    404: 'No booking with this code (BOOKING_NOT_FOUND)',
  })
  verifyBooking(
    @Param() params: BookingCodeParamDto,
    @Query() query: VerifyBookingQueryDto,
  ): Promise<BookingVerificationDto> {
    return this.integrationsService.verifyBooking(
      params.bookingCode,
      query.date,
    );
  }
}
