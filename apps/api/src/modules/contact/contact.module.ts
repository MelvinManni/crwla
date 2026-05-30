import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

// MailService is provided by the global MailModule (src/core/mail) — no need
// to declare it here anymore.
@Module({
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
