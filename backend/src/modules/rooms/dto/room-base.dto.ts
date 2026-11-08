import { ApiProperty } from '@nestjs/swagger';

// Pola wspólne dla widoku listy i widoku szczegółów pokoju. (DamianTchorzewski_72206)
export class RoomBaseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({ example: '101' })
  roomNumber: string;

  @ApiProperty({ example: 'Pokój Standard Dwuosobowy' })
  name: string;

  @ApiProperty({
    description: 'Price per night in PLN with two decimal places',
    example: 350,
  })
  pricePerNight: number;

  @ApiProperty({ description: 'Maximum number of guests', example: 2 })
  capacity: number;

  @ApiProperty({
    example: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32',
  })
  imageUrl: string;

  @ApiProperty({
    type: [String],
    example: ['WiFi', 'TV', 'Klimatyzacja', 'Łazienka'],
  })
  amenities: string[];
}
