export interface IConfiguration {
  nodeEnv: string;
  port: number;
  logLevel: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  swagger: {
    enabled: boolean;
    path: string;
  };
  cors: {
    origin: string;
  };
  webhooks: {
    timeoutMs: number;
  };
  admin: {
    apiKeyHeader: string;
    timestampHeader: string;
    signatureHeader: string;
  };
  socket: {
    corsOrigin: string;
    transports: string[];
  };
}

export const configuration = (): IConfiguration => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/casino_chat_saas',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '24h',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH || '/api/docs',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
  webhooks: {
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000', 10),
  },
  admin: {
    apiKeyHeader: process.env.ADMIN_API_KEY_HEADER || 'X-Api-Key',
    timestampHeader: process.env.ADMIN_TIMESTAMP_HEADER || 'X-Timestamp',
    signatureHeader: process.env.ADMIN_SIGNATURE_HEADER || 'X-Signature',
  },
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3001',
    transports: (process.env.SOCKET_TRANSPORTS || 'websocket,polling').split(','),
  },
});
