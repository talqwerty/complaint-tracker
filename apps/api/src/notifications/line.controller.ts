import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface LineEvent {
  type?: string;
  source?: { userId?: string; groupId?: string; roomId?: string };
}

@Controller('line')
export class LineController {
  private readonly logger = new Logger(LineController.name);
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('LINE_CHANNEL_SECRET') ?? '';
  }

  // LINE Messaging API webhook. Logs the source id of every event so you can
  // copy it into LINE_TARGET_ID. Always returns 200 so LINE marks it healthy.
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-line-signature') signature?: string,
  ): { ok: true } {
    const raw = req.rawBody ?? Buffer.from('');
    this.verifySignature(raw, signature);

    const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
    const events: LineEvent[] = body.events ?? [];
    for (const event of events) {
      const src = event.source ?? {};
      this.logger.log(
        `LINE event=${event.type ?? '-'} userId=${src.userId ?? '-'} groupId=${src.groupId ?? '-'} roomId=${src.roomId ?? '-'}`,
      );
    }
    return { ok: true };
  }

  private verifySignature(raw: Buffer, signature?: string): void {
    // Skip verification when no secret is configured (local/dev only).
    if (!this.secret) return;

    const expected = createHmac('sha256', this.secret)
      .update(raw)
      .digest('base64');
    const provided = signature ?? '';
    const ok =
      provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!ok) {
      this.logger.warn('LINE webhook signature mismatch — rejecting');
      throw new UnauthorizedException('invalid signature');
    }
  }
}
