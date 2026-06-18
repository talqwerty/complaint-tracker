import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export interface CaseSummary {
  caseNumber: string;
  customerName: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
}

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly token: string;
  private readonly target: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
    this.target = config.get<string>('LINE_TARGET_ID') ?? '';
  }

  isEnabled(): boolean {
    return Boolean(this.token && this.target);
  }

  async pushCaseCreated(c: CaseSummary): Promise<void> {
    const text = [
      `[เคสใหม่] ${c.caseNumber}`,
      `ลูกค้า: ${c.customerName}`,
      `หัวข้อ: ${c.subject}`,
      `ประเภท: ${c.category}`,
      `ความสำคัญ: ${c.priority}`,
      `สถานะ: ${c.status}`,
    ].join('\n');

    await this.push(text);
  }

  async pushCaseStatusChanged(c: CaseSummary, oldStatus: string): Promise<void> {
    const text = [
      `[อัปเดตสถานะ] ${c.caseNumber}`,
      `ลูกค้า: ${c.customerName}`,
      `หัวข้อ: ${c.subject}`,
      `สถานะ: ${oldStatus} → ${c.status}`,
    ].join('\n');

    await this.push(text);
  }

  private async push(text: string): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.debug('LINE not configured — skip notification');
      return;
    }

    try {
      const res = await fetch(LINE_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          to: this.target,
          messages: [{ type: 'text', text }],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`LINE push failed (${res.status}): ${body}`);
      }
    } catch (err) {
      // Never let a notification failure break case operations.
      this.logger.error(`LINE push error: ${String(err)}`);
    }
  }
}
