import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import {
  OPCOES_UPLOAD_IMAGEM,
  removerImagem,
  salvarImagem,
} from '@core/common/upload/image-upload.util';
import { ProductsService } from '../application/products.service';
import { UpdateStatusDto } from '@modules/users/presentation/dto/update-status.dto';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';

@ApiTags('Produtos')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  // Leitura liberada a qualquer usuário autenticado (necessária no PDV).
  @Get()
  @ApiOperation({ summary: 'Lista produtos (paginado, com filtros)' })
  list(@Query() query: ProductQueryDto) {
    return this.service.list(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Busca rápida por nome/código de barras (PDV)' })
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  // Antes de :id — sem isto o Express casaria "barcode" como um id e o
  // ParseUUIDPipe rejeitaria a rota.
  @Get('barcode/:codigo')
  @ApiOperation({ summary: 'Busca exata por código de barras (leitor do PDV)' })
  getByBarcode(@Param('codigo') codigo: string) {
    return this.service.getByCodigoBarras(codigo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um produto' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  // Escrita restrita a gestão.
  @Post()
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Cria um produto' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Atualiza um produto' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Ativa/inativa um produto' })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStatusDto) {
    return this.service.setStatus(id, dto.ativo);
  }

  @Post(':id/image')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Envia a imagem do produto (exibida no catálogo)' })
  @UseInterceptors(FileInterceptor('file', OPCOES_UPLOAD_IMAGEM))
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Grava a nova imagem só depois de validar o produto (dentro do service);
    // salvarImagem valida magic bytes e gera o nome no servidor.
    const url = await salvarImagem(file?.buffer, 'produto');
    const { produto, imagemAnterior } = await this.service.trocarImagem(id, url);
    // Só apaga a antiga depois que a nova está registrada — falha aqui não
    // deixa o produto apontando para um arquivo inexistente.
    await removerImagem(imagemAnterior, 'produto');
    return produto;
  }

  @Delete(':id/image')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Remove a imagem do produto' })
  async removeImage(@Param('id', ParseUUIDPipe) id: string) {
    const { produto, imagemAnterior } = await this.service.trocarImagem(id, null);
    await removerImagem(imagemAnterior, 'produto');
    return produto;
  }
}
