'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

/**
 * Loads the reCAPTCHA v3 script for the auth pages. When no site key is
 * configured it renders children untouched, so dev/preview without keys just
 * skips the captcha (the API also no-ops verification when its secret is
 * unset). Wrap auth routes with this; consume the token via useRecaptchaToken.
 */
export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  if (!SITE_KEY) return <>{children}</>;
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={SITE_KEY}
      scriptProps={{ async: true, defer: true, appendTo: 'head' }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
