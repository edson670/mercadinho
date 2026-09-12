import { Module } from '@nestjs/common';
import { GEOCODING_PROVIDER } from './domain/geocoding.provider';
import { NominatimProvider } from './infra/nominatim.provider';
import { GeocodingService } from './application/geocoding.service';
import { PublicGeocodingController } from './presentation/public-geocoding.controller';

@Module({
  controllers: [PublicGeocodingController],
  providers: [{ provide: GEOCODING_PROVIDER, useClass: NominatimProvider }, GeocodingService],
  exports: [GeocodingService],
})
export class GeocodingModule {}
