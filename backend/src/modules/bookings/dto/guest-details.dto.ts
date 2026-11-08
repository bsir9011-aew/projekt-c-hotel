import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { trim } from '../../../common/transformers/string.transformers.js';

// Cyfry z opcjonalnym plusem na początku. Dozwolone są spacje i myślniki, łącznie 7-20 znaków. (DamianTchorzewski_72206)
const PHONE_PATTERN = /^\+?[0-9][0-9 -]{5,18}[0-9]$/;

export class GuestDetailsDto {
  @ApiProperty({ maxLength: 100, example: 'Jan' })
  @Transform(trim)
  @MaxLength(100)
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ maxLength: 100, example: 'Kowalski' })
  @Transform(trim)
  @MaxLength(100)
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    format: 'email',
    maxLength: 254,
    example: 'jan.kowalski@example.com',
  })
  @Transform(trim)
  @MaxLength(254)
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Digits with an optional leading plus. Spaces and hyphens are allowed, 7 to 20 characters',
    example: '+48123456789',
  })
  @Transform(trim)
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone: string;
}
