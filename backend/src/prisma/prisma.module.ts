import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Moduł globalny: PrismaService jest dostępny we wszystkich modułach bez ponownego importu. (DamianTchorzewski_72206)
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
