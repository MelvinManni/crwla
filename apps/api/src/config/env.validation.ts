import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  API_BASE_PATH: Joi.string().default('/api'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  COOKIE_NAME: Joi.string().default('crwla_token'),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),

  JWT_SECRET: Joi.string().min(8).required(),
  SESSION_DAYS: Joi.number().default(14),

  ADMIN_EMAIL: Joi.string().email().default('admin@crwla.io'),
  ADMIN_PASSWORD: Joi.string().default('admin'),
  ADMIN_NAME: Joi.string().default('Admin'),

  // --- Google OAuth (optional — /auth/google 503s until both are set)
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .default('http://localhost:3001/api/auth/google/callback'),

  // --- Email verification
  EMAIL_VERIFICATION_TTL_HOURS: Joi.number().default(24),

  // --- reCAPTCHA v3 (optional — verification is skipped until the secret is set)
  RECAPTCHA_SECRET_KEY: Joi.string().optional().allow(''),
  RECAPTCHA_MIN_SCORE: Joi.number().min(0).max(1).default(0.5),

  // --- Rate limiting (global default; auth routes are stricter in code)
  THROTTLE_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),

  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional().allow(''),

  ELASTICSEARCH_URL: Joi.string().uri().optional().allow(''),
  ELASTICSEARCH_INDEX: Joi.string().default('crwla_results'),

  USER_AGENT: Joi.string().default('CRWLA/1.0'),
  DEFAULT_LOCALE: Joi.string().default('en-US'),
  DEFAULT_REGION: Joi.string().default('US'),

  ANTHROPIC_API_KEY: Joi.string().optional().allow(''),
  ANTHROPIC_MODEL: Joi.string().default('claude-haiku-4-5-20251001'),

  // --- Billing
  WEB_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  POLAR_ACCESS_TOKEN: Joi.string().optional().allow(''),
  POLAR_SERVER: Joi.string().valid('sandbox', 'production').default('sandbox'),
  POLAR_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // --- Transactional mail (Mailtrap by default)
  MAIL_FROM: Joi.string().default('CRWLA <hello@crwla.com>'),
  MAIL_SUPPORT_TO: Joi.string().email().default('support@crwla.com'),
  MAILTRAP_HOST: Joi.string().default('sandbox.smtp.mailtrap.io'),
  MAILTRAP_PORT: Joi.number().default(2525),
  MAILTRAP_USER: Joi.string().optional().allow(''),
  MAILTRAP_PASSWORD: Joi.string().optional().allow(''),
});

export type EnvVars = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_BASE_PATH: string;
  CORS_ORIGIN: string;
  COOKIE_NAME: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  SESSION_DAYS: number;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  ADMIN_NAME: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL: string;
  EMAIL_VERIFICATION_TTL_HOURS: number;
  RECAPTCHA_SECRET_KEY?: string;
  RECAPTCHA_MIN_SCORE: number;
  THROTTLE_TTL_SECONDS: number;
  THROTTLE_LIMIT: number;
  REDIS_URL?: string;
  ELASTICSEARCH_URL?: string;
  ELASTICSEARCH_INDEX: string;
  USER_AGENT: string;
  DEFAULT_LOCALE: string;
  DEFAULT_REGION: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL: string;
  MAIL_FROM: string;
  MAIL_SUPPORT_TO: string;
  MAILTRAP_HOST: string;
  MAILTRAP_PORT: number;
  MAILTRAP_USER?: string;
  MAILTRAP_PASSWORD?: string;
};
