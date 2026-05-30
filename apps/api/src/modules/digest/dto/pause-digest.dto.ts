import { IsNotEmpty, IsString } from 'class-validator';

export class PauseDigestDto {
  // Signed crawl token from the digest email's "Pause digest" link.
  @IsString()
  @IsNotEmpty()
  token!: string;
}
