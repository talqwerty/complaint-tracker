import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuthUser } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Tighter limit than the global default: 5 attempts / minute / IP to blunt
  // brute-force and credential-stuffing.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // TEMP diagnostic: reveal how the client IP arrives behind Railway's proxy
  // so the rate-limiter tracker can be keyed correctly. Remove after.
  @SkipThrottle()
  @Get('_debug/ip')
  debugIp(@Req() req: Request) {
    return {
      ip: req.ip,
      ips: req.ips,
      xForwardedFor: req.headers['x-forwarded-for'] ?? null,
      xRealIp: req.headers['x-real-ip'] ?? null,
      xEnvoyExternalAddress: req.headers['x-envoy-external-address'] ?? null,
    };
  }
}
