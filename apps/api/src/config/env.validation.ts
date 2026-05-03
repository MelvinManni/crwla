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

  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional().allow(''),

  ELASTICSEARCH_URL: Joi.string().uri().optional().allow(''),
  ELASTICSEARCH_INDEX: Joi.string().default('crwla_results'),

  USER_AGENT: Joi.string().default('CRWLA/1.0'),
  DEFAULT_LOCALE: Joi.string().default('en-US'),
  DEFAULT_REGION: Joi.string().default('US'),

  ANTHROPIC_API_KEY: Joi.string().optional().allow(''),
  ANTHROPIC_MODEL: Joi.string().default('claude-haiku-4-5-20251001'),
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
  REDIS_URL?: string;
  ELASTICSEARCH_URL?: string;
  ELASTICSEARCH_INDEX: string;
  USER_AGENT: string;
  DEFAULT_LOCALE: string;
  DEFAULT_REGION: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL: string;
};
