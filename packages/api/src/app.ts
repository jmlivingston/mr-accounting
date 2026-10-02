import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { limits } from './config';
import { logger } from './logger';
import {
  apiRateLimit,
  corsPolicy,
  errorHandler,
  loginRateLimit,
  noStore,
  notFound,
  parseCookies,
  restrictMethods,
  securityHeaders,
} from './middleware/security';
import { appRouter } from './router';
import { createContext } from './trpc';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(corsPolicy);
  app.use(restrictMethods);
  app.use(noStore);
  app.use(express.json({ limit: limits.bodySize }));
  app.use(parseCookies);
  app.use('/trpc', apiRateLimit);
  app.use('/trpc/auth.login', loginRateLimit);
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          logger.error(`tRPC error on ${path}:`, error);
        }
      },
    }),
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
