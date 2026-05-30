import { Module } from '@nestjs/common';
import { DigestController } from './digest.controller';
import { DigestTokenService } from './digest-token.service';

/**
 * Owns the digest-unsubscribe token + its public one-click endpoint.
 * DigestTokenService is exported so NotificationsModule can sign the link it
 * embeds in the digest email. PrismaService comes from the @Global PrismaModule.
 */
@Module({
  controllers: [DigestController],
  providers: [DigestTokenService],
  exports: [DigestTokenService],
})
export class DigestModule {}
