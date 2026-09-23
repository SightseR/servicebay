import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage { to: string; subject: string; text: string; html: string }

/**
 * Sends through Resend's REST API when RESEND_API_KEY is set; otherwise logs the message
 * (local dev — the reset link shows up in `docker compose logs backend`). Plain fetch,
 * no SDK: one endpoint, one header.
 */
@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly apiKey?: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY') || undefined;
    this.from = config.get<string>('MAIL_FROM') ?? 'ServiceBay <onboarding@resend.dev>';
  }

  get isConfigured() { return !!this.apiKey; }

  async send(msg: MailMessage): Promise<void> {
    if (!this.apiKey) {
      this.log.warn(`[mail not configured] To: ${msg.to} | ${msg.subject}\n${msg.text}`);
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.log.error(`Resend rejected the email (${res.status}): ${body}`);
      throw new Error('Email delivery failed');
    }
  }
}
