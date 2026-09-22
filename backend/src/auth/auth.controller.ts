import { Body, Controller, Get, HttpCode, Ip, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from './cookies';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthResponse, AuthUser, IssuedTokens } from './types';

/** Stricter than the global default: brute-force and signup-spam protection. */
const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(private readonly auth: AuthService, config: ConfigService) {
    this.isProduction = config.get('NODE_ENV') === 'production';
  }

  private respond(res: Response, issued: IssuedTokens): AuthResponse {
    setRefreshCookie(res, issued.refreshToken, issued.refreshExpiresAt, this.isProduction);
    return { accessToken: issued.accessToken, user: issued.user };
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const issued = await this.auth.login(dto, { userAgent: req.headers['user-agent']?.slice(0, 300), ip });
    return this.respond(res, issued);
  }

  /**
   * Browser clients send the refresh token automatically via the httpOnly cookie (D16/D17).
   * A body field is still accepted for non-browser clients (smoke scripts, future mobile).
   */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE] ?? dto.refreshToken;
    if (!token) throw new UnauthorizedException('No refresh token');
    try {
      const issued = await this.auth.refresh(token);
      return this.respond(res, issued);
    } catch (e) {
      clearRefreshCookie(res, this.isProduction); // a dead cookie shouldn't keep being sent
      throw e;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.sid);
    clearRefreshCookie(res, this.isProduction);
  }

  /** "Log out everywhere" — every device for this account. */
  @Post('logout-all')
  @HttpCode(204)
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(user.id);
    clearRefreshCookie(res, this.isProduction);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto.displayName);
  }

  /** Other devices are signed out; this one keeps its session, so the cookie stays. */
  @Patch('me/password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, dto, user.sid);
  }
}
