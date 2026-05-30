import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Namespaces the HMAC so a digest token can never be replayed as some other
 * kind of signed value that happens to share the secret.
 */
const PURPOSE = 'digest-unsubscribe';

/**
 * Stateless, signed tokens for the one-click "pause digest" email link.
 *
 * A token is `<base64url(searchId)>.<base64url(HMAC-SHA256)>`. The crawl id
 * is recoverable from the token (so no DB lookup table is needed), and the
 * HMAC — keyed on the app's JWT_SECRET — makes it unforgeable: a recipient
 * can't tweak the id to pause someone else's crawl. There's no expiry by
 * design; this is a long-lived "manage your emails" link, like the
 * unsubscribe links every newsletter ships.
 */
@Injectable()
export class DigestTokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me';
  }

  /** Sign a crawl id into an opaque, URL-safe unsubscribe token. */
  sign(searchId: string): string {
    const payload = b64urlEncode(Buffer.from(searchId, 'utf8'));
    return `${payload}.${this.mac(payload)}`;
  }

  /**
   * Recover the crawl id from a token. Returns null when the token is
   * missing, malformed, or the signature doesn't match — callers should
   * treat all three the same ("invalid link") so we don't leak which it was.
   */
  verify(token: string | undefined | null): string | null {
    if (!token) return null;
    const dot = token.indexOf('.');
    if (dot <= 0 || dot === token.length - 1) return null;
    const payload = token.slice(0, dot);
    const sig = Buffer.from(token.slice(dot + 1));
    const expected = Buffer.from(this.mac(payload));
    // Constant-time compare; timingSafeEqual throws on length mismatch.
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
      return null;
    }
    const id = b64urlDecode(payload);
    return id.length > 0 ? id : null;
  }

  private mac(payload: string): string {
    return b64urlEncode(
      createHmac('sha256', this.secret).update(`${PURPOSE}:${payload}`).digest(),
    );
  }
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  try {
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    return '';
  }
}
