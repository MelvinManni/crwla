import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MailService } from './mail.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, MailService],
  exports: [MailService],
})
export class ContactModule {}
