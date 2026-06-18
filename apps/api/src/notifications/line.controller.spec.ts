import { createHmac } from 'node:crypto';
import { UnauthorizedException, type RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { LineController } from './line.controller';

function makeController(secret: string): LineController {
  const config = { get: () => secret } as unknown as ConfigService;
  return new LineController(config);
}

function sign(secret: string, raw: Buffer): string {
  return createHmac('sha256', secret).update(raw).digest('base64');
}

function req(raw: Buffer): RawBodyRequest<Request> {
  return { rawBody: raw } as RawBodyRequest<Request>;
}

describe('LineController', () => {
  const secret = 'channel-secret';

  it('accepts an event with a valid signature and returns ok', () => {
    const controller = makeController(secret);
    const raw = Buffer.from(
      JSON.stringify({ events: [{ type: 'message', source: { userId: 'U123' } }] }),
    );

    expect(controller.webhook(req(raw), sign(secret, raw))).toEqual({ ok: true });
  });

  it('rejects an invalid signature', () => {
    const controller = makeController(secret);
    const raw = Buffer.from(JSON.stringify({ events: [] }));

    expect(() => controller.webhook(req(raw), 'wrong-signature')).toThrow(
      UnauthorizedException,
    );
  });

  it('skips verification when no secret is configured', () => {
    const controller = makeController('');
    const raw = Buffer.from(JSON.stringify({ events: [] }));

    expect(controller.webhook(req(raw), undefined)).toEqual({ ok: true });
  });

  it('handles an empty body without throwing', () => {
    const controller = makeController('');

    expect(controller.webhook(req(Buffer.from('')), undefined)).toEqual({ ok: true });
  });
});
