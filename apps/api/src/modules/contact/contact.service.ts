import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactPurpose } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailService } from './mail.service';
import { CreateContactSubmissionDto } from './contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: CreateContactSubmissionDto, ipAddress?: string | null, userAgent?: string | null) {
    const purpose: ContactPurpose = dto.purpose ?? ContactPurpose.OTHER;
    const submission = await this.prisma.contactSubmission.create({
      data: {
        purpose,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        company: dto.company?.trim() || null,
        role: dto.role?.trim() || null,
        volume: typeof dto.volume === 'number' ? dto.volume : null,
        message: dto.message?.trim() || null,
        ipAddress: ipAddress?.slice(0, 80) ?? null,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
    });

    const supportTo = this.config.get<string>('MAIL_SUPPORT_TO') ?? 'support@crwla.com';
    const subject = `[CRWLA contact] ${purpose} — ${submission.name}`;
    const lines = [
      `Purpose: ${purpose}`,
      `Name:    ${submission.name}`,
      `Email:   ${submission.email}`,
      submission.company ? `Company: ${submission.company}` : null,
      submission.role ? `Role:    ${submission.role}` : null,
      typeof submission.volume === 'number' ? `Volume:  ~${submission.volume} keywords` : null,
      submission.ipAddress ? `IP:      ${submission.ipAddress}` : null,
      '',
      'Message:',
      submission.message?.trim() || '(empty)',
      '',
      `Submission ID: ${submission.id}`,
      `Received:      ${submission.createdAt.toISOString()}`,
    ].filter((l): l is string => l !== null);
    const text = lines.join('\n');
    const html = buildHtml({ ...submission, purpose });

    try {
      const result = await this.mail.send({
        to: supportTo,
        subject,
        text,
        html,
        replyTo: submission.email,
      });
      if (!result.skipped) {
        await this.prisma.contactSubmission.update({
          where: { id: submission.id },
          data: { emailedAt: new Date(), emailError: null },
        });
      } else {
        await this.prisma.contactSubmission.update({
          where: { id: submission.id },
          data: { emailError: 'mailer not configured' },
        });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to email contact submission ${submission.id}: ${reason}`);
      await this.prisma.contactSubmission.update({
        where: { id: submission.id },
        data: { emailError: reason.slice(0, 500) },
      });
    }

    return { ok: true, id: submission.id };
  }
}

type SubmissionRow = {
  id: string;
  purpose: ContactPurpose;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  volume: number | null;
  message: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

function escape(input: string) {
  return input.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function buildHtml(s: SubmissionRow) {
  const row = (k: string, v: string | number | null) =>
    v === null || v === undefined || v === ''
      ? ''
      : `<tr><td style="padding:6px 14px 6px 0;color:#6e6b63;font-family:Menlo,monospace;font-size:12px;text-transform:uppercase;letter-spacing:0.1em">${escape(
          k,
        )}</td><td style="padding:6px 0;font-size:14px;color:#0e0e0e">${escape(String(v))}</td></tr>`;
  const messageBlock = s.message
    ? `<div style="margin-top:18px;padding:16px 18px;background:#f3f1ec;border-left:3px solid #ff5e3a;border-radius:6px;font-size:14px;line-height:1.55;color:#2a2a2a;white-space:pre-wrap">${escape(
        s.message,
      )}</div>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,sans-serif;color:#0e0e0e">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e3da;border-radius:12px;padding:28px">
    <div style="font-size:11px;color:#6e6b63;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px">CRWLA contact form</div>
    <h1 style="font-size:22px;margin:0 0 4px;font-weight:600">${escape(s.purpose)} from ${escape(s.name)}</h1>
    <a href="mailto:${escape(s.email)}" style="color:#ff5e3a;text-decoration:none;font-size:14px">${escape(s.email)}</a>
    <table style="width:100%;margin-top:18px;border-collapse:collapse">
      ${row('Company', s.company)}
      ${row('Role', s.role)}
      ${row('Volume', typeof s.volume === 'number' ? `~${s.volume} keywords` : null)}
      ${row('IP', s.ipAddress)}
      ${row('Received', s.createdAt.toISOString())}
      ${row('Submission ID', s.id)}
    </table>
    ${messageBlock}
  </div>
</body></html>`;
}
