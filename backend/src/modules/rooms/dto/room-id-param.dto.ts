import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RoomIdParamDto {
  @ApiProperty({
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
  })
  @IsUUID()
  id: string;
}
