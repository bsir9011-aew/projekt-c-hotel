import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { API_KEY_HEADER } from '../constants/api.constants.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { ApiErrorCode } from '../errors/api-error-code.enum.js';
import { ApiException } from '../errors/api-exception.js';
import { hashApiKey, parseApiKeys, type ApiClient } from './api-keys.js';

export interface IntegrationRequest extends Request {
  // Nazwa zespołu, który wykonał żądanie. Ustawiana po poprawnym uwierzytelnieniu. (DamianTchorzewski_72206)
  integrationClient?: string;
}

// Wpuszcza tylko żądania z nagłówkiem X-API-Key zawierającym klucz znanego zespołu. (DamianTchorzewski_72206)
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly clients: ApiClient[];

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.clients = parseApiKeys(
      config.get('INTEGRATION_API_KEYS', { infer: true }),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IntegrationRequest>();
    const header = request.headers[API_KEY_HEADER.toLowerCase()];
    const client = typeof header === 'string' ? this.findClient(header) : null;

    if (!client) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.UNAUTHORIZED,
        'Missing or invalid API key.',
      );
    }

    request.integrationClient = client.name;
    return true;
  }

  // Przechodzi przez wszystkie klucze bez przerywania, aby czas odpowiedzi nie zdradzał, który klucz był bliski. (DamianTchorzewski_72206)
  private findClient(providedKey: string): ApiClient | null {
    const digest = hashApiKey(providedKey);
    let match: ApiClient | null = null;

    for (const client of this.clients) {
      if (timingSafeEqual(client.keyDigest, digest)) {
        match = client;
      }
    }

    return match;
  }
}
