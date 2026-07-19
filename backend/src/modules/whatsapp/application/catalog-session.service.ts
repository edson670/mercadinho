import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '@core/database/prisma.service';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // sem 0/O/1/l/I ambíguos
const TAMANHO_CODIGO = 8;
const VALIDADE_HORAS = 2;

/**
 * Código curto e opaco que carrega o telefone do cliente até o catálogo,
 * para pré-preencher o checkout. Evita expor o telefone na URL (PII em
 * query string acabaria em logs/histórico do navegador) e mantém o link
 * enviado por WhatsApp curto — um JWT embutido passava de 250 caracteres.
 */
@Injectable()
export class CatalogSessionService {
  private readonly catalogUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.catalogUrl = (this.config.get<string>('CATALOG_PUBLIC_URL') ?? 'http://localhost:5173/catalogo')
      .replace(/\/+$/, '');
  }

  async criarLink(telefone: string, nome?: string): Promise<string> {
    const codigo = this.gerarCodigo();
    const expiraEm = new Date(Date.now() + VALIDADE_HORAS * 60 * 60_000);
    await this.prisma.sessaoCatalogo.create({
      data: { codigo, telefone, nome, expiraEm },
    });
    return `${this.catalogUrl}?s=${codigo}`;
  }

  async resolver(codigo: string): Promise<{ telefone: string; nome?: string }> {
    const sessao = await this.prisma.sessaoCatalogo.findUnique({ where: { codigo } });
    if (!sessao || sessao.expiraEm.getTime() < Date.now()) {
      throw new UnauthorizedException('Link expirado. Envie uma mensagem para receber um novo.');
    }
    return { telefone: sessao.telefone, nome: sessao.nome ?? undefined };
  }

  private gerarCodigo(): string {
    const bytes = randomBytes(TAMANHO_CODIGO);
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i++) {
      codigo += ALFABETO[bytes[i] % ALFABETO.length];
    }
    return codigo;
  }
}
