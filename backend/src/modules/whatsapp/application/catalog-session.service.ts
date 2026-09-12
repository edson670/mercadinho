import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '@core/database/prisma.service';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // sem 0/O/1/l/I ambíguos
const TAMANHO_CODIGO = 8;
export const VALIDADE_HORAS = 2;
/**
 * Só reaproveita um link que ainda tenha fôlego. Devolver um que vence em
 * cinco minutos é pior que emitir outro: o cliente monta o carrinho e perde.
 */
const MARGEM_REUSO_MINUTOS = 30;

/**
 * Código curto e opaco que carrega o telefone do cliente até o catálogo,
 * para pré-preencher o checkout. Evita expor o telefone na URL (PII em
 * query string acabaria em logs/histórico do navegador) e mantém o link
 * enviado por WhatsApp curto — um JWT embutido passava de 250 caracteres.
 */
@Injectable()
export class CatalogSessionService {
  private readonly logger = new Logger(CatalogSessionService.name);
  private readonly catalogUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.catalogUrl = (
      this.config.get<string>('CATALOG_PUBLIC_URL') ?? 'http://localhost:5173/catalogo'
    ).replace(/\/+$/, '');
  }

  /**
   * Devolve o link do catálogo, reaproveitando a sessão vigente do número.
   * Criar uma linha nova a cada mensagem recebida enchia a tabela (que guarda
   * telefone e nome) sem necessidade — e dava ao cliente um link diferente a
   * cada contato, invalidando na prática o que ele já tinha aberto.
   */
  async criarLink(telefone: string, nome?: string): Promise<string> {
    const vigente = await this.prisma.sessaoCatalogo.findFirst({
      where: {
        telefone,
        expiraEm: { gt: new Date(Date.now() + MARGEM_REUSO_MINUTOS * 60_000) },
      },
      orderBy: { expiraEm: 'desc' },
    });

    if (vigente) {
      // O nome pode ter sido cadastrado depois da sessão ter sido criada.
      if (nome && !vigente.nome) {
        await this.prisma.sessaoCatalogo.update({ where: { id: vigente.id }, data: { nome } });
      }
      return this.montarUrl(vigente.codigo);
    }

    const codigo = this.gerarCodigo();
    const expiraEm = new Date(Date.now() + VALIDADE_HORAS * 60 * 60_000);
    await this.prisma.sessaoCatalogo.create({
      data: { codigo, telefone, nome, expiraEm },
    });
    return this.montarUrl(codigo);
  }

  async resolver(codigo: string): Promise<{ telefone: string; nome?: string }> {
    const sessao = await this.prisma.sessaoCatalogo.findUnique({ where: { codigo } });
    if (!sessao || sessao.expiraEm.getTime() < Date.now()) {
      throw new UnauthorizedException('Link expirado. Envie uma mensagem para receber um novo.');
    }
    return { telefone: sessao.telefone, nome: sessao.nome ?? undefined };
  }

  /** Link de acompanhamento do pedido (mesma origem pública do catálogo). */
  linkAcompanhamento(trackingToken: string): string {
    return `${this.catalogUrl}/pedido/${trackingToken}`;
  }

  /** Sessões do número — apagadas junto com a anonimização LGPD do cliente. */
  async removerPorTelefone(telefone: string): Promise<number> {
    const { count } = await this.prisma.sessaoCatalogo.deleteMany({ where: { telefone } });
    return count;
  }

  /**
   * Sessão vencida não serve para nada e guarda telefone e nome. Sem este
   * expurgo a tabela só crescia, acumulando PII de todo mundo que um dia
   * mandou mensagem para a loja.
   *
   * Quem agenda é LimpezaSessoesService — manter o @Cron aqui obrigaria a
   * importar @nestjs/schedule (ESM), que o Jest não carrega, e este serviço
   * ficaria sem teste.
   */
  async purgarExpiradas(): Promise<number> {
    const { count } = await this.prisma.sessaoCatalogo.deleteMany({
      where: { expiraEm: { lt: new Date() } },
    });
    if (count > 0) this.logger.log(`${count} sessão(ões) de catálogo expirada(s) removida(s)`);
    return count;
  }

  private montarUrl(codigo: string): string {
    return `${this.catalogUrl}?s=${codigo}`;
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
