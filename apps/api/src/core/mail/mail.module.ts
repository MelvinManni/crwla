import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerService } from './mailer.service';

/**
 * Global Mailtrap-backed mailer. Marked @Global so any module (auth email
 * verification, contact form, notifications, …) can inject MailService /
 * MailerService without re-importing.
 *
 * - MailService  — low-level transport (subject/text/html → SMTP).
 * - MailerService — renders the brand HTML templates in `email-templates/`
 *   and exposes one typed method per template.
 */
@Global()
@Module({
  providers: [MailService, MailerService],
  exports: [MailService, MailerService],
})
export class MailModule {}
