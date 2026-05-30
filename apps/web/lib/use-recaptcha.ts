'use client';

import { useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

/**
 * Returns a function that fetches a fresh reCAPTCHA v3 token for a given
 * action. Resolves to `undefined` when reCAPTCHA isn't configured (no provider
 * mounted) or on any error — callers send it as `recaptchaToken` and the API
 * skips verification when its secret is unset.
 */
export function useRecaptchaToken() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  return useCallback(
    async (action: string): Promise<string | undefined> => {
      if (!executeRecaptcha) return undefined;
      try {
        return await executeRecaptcha(action);
      } catch {
        return undefined;
      }
    },
    [executeRecaptcha],
  );
}
