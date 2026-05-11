import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Mailtrap-backed transactional mailer. Falls back to a no-op mode when SMTP
 * credentials are not configured so dev / CI never blocks on missing secrets.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private from!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('MAILTRAP_HOST');
    const port = Number(this.config.get<number>('MAILTRAP_PORT'));
    const user = this.config.get<string>('MAILTRAP_USER');
    const pass = this.config.get<string>('MAILTRAP_PASSWORD');
    this.from = this.config.get<string>('MAIL_FROM') ?? 'CRWLA <hello@crwla.com>';

    if (!host || !user || !pass) {
      this.logger.warn('Mailtrap credentials missing — outbound mail will be skipped.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    this.logger.log(`Mailer ready (${host}:${port}, from=${this.from}).`);
  }

  isConfigured() {
    return this.transporter !== null;
  }

  async send(opts: { to: string; subject: string; text: string; html?: string; replyTo?: string }) {
    if (!this.transporter) {
      this.logger.warn(`Skipping mail to ${opts.to} — mailer not configured.`);
      return { skipped: true as const };
    }
    const info = await this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    return { skipped: false as const, messageId: info.messageId };
  }
}
