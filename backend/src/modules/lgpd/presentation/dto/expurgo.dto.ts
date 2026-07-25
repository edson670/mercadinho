import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ExpurgoMensagensDto {
  @ApiPropertyOptional({
    description: 'Sobrepõe RETENCAO_MENSAGENS_DIAS só nesta execução',
    example: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dias?: number;
}
