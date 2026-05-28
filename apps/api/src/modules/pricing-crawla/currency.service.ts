import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Snapshot of USD-base FX rates. Mirrors the rate table the design
 * prototype uses (crawla-data.js) so dev UI and API agree out of the box.
 * Live deploys override via `FX_RATES` env (JSON: { "NGN": 1580, ... }).
 */
const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1580,
  EUR: 0.92,
  GBP: 0.79,
  GHS: 12.4,
  KES: 142,
  ZAR: 19.2,
  CAD: 1.37,
};

/** Supported display currencies — matches the FE toggle. */
export const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'EUR', 'GBP', 'GHS'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly rates: Record<string, number>;

  constructor(config: ConfigService) {
    const fromEnv = config.get<string>('FX_RATES');
    if (fromEnv) {
      try {
        const parsed = JSON.parse(fromEnv) as Record<string, number>;
        this.rates = { USD: 1, ...DEFAULT_RATES, ...parsed };
      } catch {
        this.logger.warn(`FX_RATES env was set but failed to parse — using defaults`);
        this.rates = { ...DEFAULT_RATES };
      }
    } else {
      this.rates = { ...DEFAULT_RATES };
    }
  }

  isSupported(ccy: string): ccy is SupportedCurrency {
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(ccy);
  }

  /** All rates as a plain object, USD = 1. Used by the convert endpoint. */
  table(): Record<string, number> {
    return { ...this.rates };
  }

  /** USD → target conversion. Unknown ccy returns the USD amount unchanged. */
  fromUsd(usd: number, target: string): number {
    const rate = this.rates[target.toUpperCase()] ?? 1;
    return usd * rate;
  }

  /** Convert any native price back to USD for ranking consistency. */
  toUsd(amount: number, fromCcy: string): number {
    const rate = this.rates[fromCcy.toUpperCase()] ?? 1;
    if (rate === 0) return amount;
    return amount / rate;
  }
}
