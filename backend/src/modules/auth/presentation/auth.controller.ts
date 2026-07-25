import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '@core/auth/public.decorator';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { AuthService } from '../application/auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  MfaDisableDto,
  MfaEnableDto,
  MfaVerifyDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { REFRESH_COOKIE, clearRefreshCookie, refreshCookieOptions } from './refresh-cookie';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    const dias = Number(/^(\d+)d$/.exec(config.get('JWT_REFRESH_EXPIRES', '7d'))?.[1] ?? 7);
    this.cookieOptions = refreshCookieOptions({
      apiPrefix: config.get<string>('API_PREFIX', 'api/v1'),
      isProduction: config.get<string>('NODE_ENV') === 'production',
      maxAgeMs: dias * 24 * 60 * 60 * 1000,
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica. Com MFA ativo, devolve mfaToken em vez de tokens de sessão',
  })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    // Senha certa mas segundo fator pendente: nenhum token de sessão ainda —
    // só o mfaToken de curta duração que autoriza chamar /auth/mfa/verify.
    if (result.mfaRequired) return result;

    const { refreshToken, ...resto } = result;
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions);
    return resto;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Segundo passo do login quando a conta tem MFA ativo' })
  async mfaVerify(@Body() dto: MfaVerifyDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...resto } = await this.auth.mfaVerify(dto.mfaToken, dto.codigo);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions);
    return resto;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o access token a partir do cookie de refresh' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Sessão expirada. Faça login novamente.');

    const { refreshToken, ...resto } = await this.auth.refresh(token);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions);
    return resto;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra a sessão (revoga o refresh token e limpa o cookie)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    // Público e idempotente de propósito: com o access token já expirado o
    // usuário ainda precisa conseguir encerrar a sessão.
    if (token) await this.auth.logout(token);
    clearRefreshCookie(res, this.cookieOptions);
    return { message: 'Sessão encerrada.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicita recuperação de senha' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefine a senha com token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gera o segredo TOTP e o QR Code para ativar o MFA' })
  mfaSetup(@CurrentUser() user: AuthUser) {
    return this.auth.mfaSetup(user.id);
  }

  @Post('mfa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirma o código do app autenticador e ativa o MFA' })
  mfaEnable(@CurrentUser() user: AuthUser, @Body() dto: MfaEnableDto) {
    return this.auth.mfaEnable(user.id, dto.codigo);
  }

  @Post('mfa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativa o MFA (exige senha + código)' })
  mfaDisable(@CurrentUser() user: AuthUser, @Body() dto: MfaDisableDto) {
    return this.auth.mfaDisable(user.id, dto);
  }
}
