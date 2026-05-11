import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactSubmissionDto } from './contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  async submit(
    @Body() dto: CreateContactSubmissionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.contact.submit(dto, ip, userAgent ?? null);
  }
}
