import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('24h'),
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('/api/docs'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
  WEBHOOK_TIMEOUT_MS: Joi.number().default(5000),
  ADMIN_API_KEY_HEADER: Joi.string().default('X-Api-Key'),
  ADMIN_TIMESTAMP_HEADER: Joi.string().default('X-Timestamp'),
  ADMIN_SIGNATURE_HEADER: Joi.string().default('X-Signature'),
  SOCKET_CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
  SOCKET_TRANSPORTS: Joi.string().default('websocket,polling'),
});
