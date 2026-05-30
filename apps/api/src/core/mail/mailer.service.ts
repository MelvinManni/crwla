import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as Handlebars from 'handlebars';
import { MailService } from './mail.service';

/**
 * Renders the brand HTML email templates in `apps/api/email-templates/` with
 * Handlebars and sends them through {@link MailService}. SMTP (Mailtrap) needs
 * the HTML fully rendered server-side, so `{{var}}` / `{{#each}}` placeholders
 * are filled here rather than by Mailtrap's template engine.
 *
 * One typed method per template keeps callers (auth, notifications, billing)
 * from hand-assembling variable bags or remembering link shapes.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly hb = Handlebars.create();
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly templatesDir: string;
  private readonly webBase: string;

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.templatesDir = this.resolveTemplatesDir();
    this.webBase = (this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  /**
   * Locate the email-templates directory across environments:
   *   - prod (compiled): copied next to dist by the build → resolved via
   *     __dirname (dist/core/mail → dist/email-templates). cwd is unreliable
   *     on Railway (it's /app, the templates aren't there).
   *   - dev / worker (ts-node): the source folder at apps/api/email-templates,
   *     reached via process.cwd().
   * EMAIL_TEMPLATES_DIR overrides everything. Falls back to the first
   * candidate so the path still logs usefully if none exist.
   */
  private resolveTemplatesDir(): string {
    const override = this.config.get<string>('EMAIL_TEMPLATES_DIR');
    const candidates = [
      override,
      resolve(__dirname, '..', '..', 'email-templates'),
      join(process.cwd(), 'email-templates'),
      join(process.cwd(), 'dist', 'email-templates'),
    ].filter((p): p is string => !!p);
    const found = candidates.find((p) => existsSync(p));
    if (!found) {
      this.logger.warn(
        `email-templates dir not found; tried: ${candidates.join(', ')}`,
      );
    }
    return found ?? candidates[0];
  }

  // ---------- public senders -----------------------------------------

  async sendVerification(
    to: string,
    vars: { firstName: string; email: string; verificationUrl: string; ttlHours: number },
  ) {
    const html = this.render('verify-email', {
      first_name: vars.firstName,
      email: vars.email,
      verification_url: vars.verificationUrl,
      ttl_hours: vars.ttlHours,
      help_url: this.url('/help'),
      privacy_url: this.url('/privacy'),
    });
    const text =
      `Hi ${vars.firstName}, welcome to CRWLA.\n\n` +
      `Confirm ${vars.email} to finish setting up your account:\n${vars.verificationUrl}\n\n` +
      `This link expires in ${vars.ttlHours} hours. If you didn't sign up, ignore this email.`;
    return this.mail.send({ to, subject: 'Verify your CRWLA email', text, html });
  }

  async sendAlertHit(
    to: string,
    vars: {
      alertId: string;
      keyword: string;
      hitTitle: string;
      hitSnippet: string;
      hitUrl: string;
      hitTime: string;
      sourceName: string;
      weekCount: number;
      relevance: number;
    },
  ) {
    const html = this.render('alert-hit', {
      keyword: vars.keyword,
      hit_title: vars.hitTitle,
      hit_snippet: vars.hitSnippet,
      hit_url: vars.hitUrl,
      hit_time: vars.hitTime,
      source_name: vars.sourceName,
      source_initial: initial(vars.sourceName),
      week_count: vars.weekCount,
      relevance: vars.relevance,
      manage_url: this.url(`/alerts/${vars.alertId}`),
      unsubscribe_url: this.url(`/alerts/${vars.alertId}?off=1`),
    });
    const text =
      `New hit on "${vars.keyword}"\n\n${vars.hitTitle}\n${vars.hitSnippet}\n\n` +
      `Read it: ${vars.hitUrl}\n\nManage this alert: ${this.url(`/alerts/${vars.alertId}`)}`;
    return this.mail.send({ to, subject: `Alert — new hit on "${vars.keyword}"`, text, html });
  }

  async sendCrawlDigest(
    to: string,
    vars: {
      searchId: string;
      /** Signed token for the no-auth one-click "pause digest" link. */
      pauseToken: string;
      jobName: string;
      schedule: string;
      newCount: number;
      totalScanned: number;
      changePct: number;
      digestDate: string;
      nextCrawl: string;
      results: Array<{ source: string; time: string; url: string; title: string; snippet: string }>;
    },
  ) {
    const html = this.render('crawl-digest', {
      job_name: vars.jobName,
      schedule: vars.schedule,
      new_count: vars.newCount,
      total_scanned: vars.totalScanned,
      change_pct: vars.changePct,
      digest_date: vars.digestDate,
      next_crawl: vars.nextCrawl,
      dashboard_url: this.url(`/crawls/${vars.searchId}`),
      settings_url: this.url(`/crawls/${vars.searchId}/edit`),
      // One-click, no-login pause. The token authorizes the toggle on its own.
      unsubscribe_url: this.url(`/digest/unsubscribe?token=${encodeURIComponent(vars.pauseToken)}`),
      results: vars.results.map((r) => ({
        source: r.source,
        source_initial: initial(r.source),
        time: r.time,
        url: r.url,
        title: r.title,
        snippet: r.snippet,
      })),
    });
    const lines = vars.results.map((r) => `• ${r.title} (${r.source}) — ${r.url}`);
    const text =
      `${vars.newCount} new results for "${vars.jobName}" (${vars.schedule} crawl)\n\n` +
      `${lines.join('\n')}\n\nView all: ${this.url(`/crawls/${vars.searchId}`)}`;
    return this.mail.send({
      to,
      subject: `${vars.newCount} new results — ${vars.jobName}`,
      text,
      html,
    });
  }

  async sendSubscriptionExpiring(
    to: string,
    vars: {
      firstName: string;
      planName: string;
      planPrice: string;
      billingCycle: string;
      daysLeft: number;
      expiryDate: string;
      autorenewStatus: string;
      activeCrawls: number;
      graceDays: number;
      features: string[];
    },
  ) {
    const html = this.render('subscription-expiring', {
      first_name: vars.firstName,
      plan_name: vars.planName,
      plan_price: vars.planPrice,
      billing_cycle: vars.billingCycle,
      days_left: vars.daysLeft,
      expiry_date: vars.expiryDate,
      autorenew_status: vars.autorenewStatus,
      active_crawls: vars.activeCrawls,
      grace_days: vars.graceDays,
      features: vars.features,
      renew_url: this.url('/billing'),
      billing_url: this.url('/billing'),
      help_url: this.url('/help'),
    });
    const text =
      `Hi ${vars.firstName}, your ${vars.planName} plan expires on ${vars.expiryDate} ` +
      `(${vars.daysLeft} days left).\n\nRenew to keep your crawls and alerts running: ${this.url('/billing')}`;
    return this.mail.send({
      to,
      subject: `Your ${vars.planName} plan expires in ${vars.daysLeft} days`,
      text,
      html,
    });
  }

  // ---------- internals ----------------------------------------------

  private url(path: string): string {
    return `${this.webBase}${path}`;
  }

  private render(name: string, vars: Record<string, unknown>): string {
    return this.compile(name)(vars);
  }

  private compile(name: string): Handlebars.TemplateDelegate {
    const cached = this.cache.get(name);
    if (cached) return cached;
    const file = resolve(this.templatesDir, `${name}.html`);
    const source = readFileSync(file, 'utf8');
    const tpl = this.hb.compile(source, { noEscape: false });
    this.cache.set(name, tpl);
    return tpl;
  }
}

/** 1–2 char uppercase badge for a source name (e.g. "Google News" → "GN"). */
function initial(source: string): string {
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
