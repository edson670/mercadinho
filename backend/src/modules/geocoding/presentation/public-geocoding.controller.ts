import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';
import { Public } from '@core/auth/public.decorator';
import { GeocodingService } from '../application/geocoding.service';

export class ReverseGeocodeQueryDto {
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  lng!: number;
}

/**
 * Consumido pelo checkout do catálogo (cliente final, sem login) para
 * preencher o endereço a partir da localização do aparelho.
 *
 * Limite apertado: é rota pública e cada chamada consome a cota que a loja
 * inteira tem no provedor.
 */
@ApiTags('Público — Localização')
@Public()
@Controller('public/geocode')
export class PublicGeocodingController {
  constructor(private readonly geocoding: GeocodingService) {}

  @Get('reverse')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @ApiOperation({ summary: 'Endereço aproximado a partir de latitude/longitude' })
  reverse(@Query() query: ReverseGeocodeQueryDto) {
    return this.geocoding.reverse(query.lat, query.lng);
  }
}
