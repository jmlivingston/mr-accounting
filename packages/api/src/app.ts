import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { limits } from './config';
import { errorCodes } from './constants';
import { createJsonFileLedgerAdapter } from './ledger/jsonFileAdapter';
import { createLedger, type Ledger } from './ledger/ledger';
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

export function createApp({ ledger = createLedger(createJsonFileLedgerAdapter()) }: { ledger?: Ledger } = {}) {
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
      createContext: createContext(ledger),
      onError: ({ error, path }) => {
        if (error.code === errorCodes.internalServerError) {
          logger.error(`tRPC error on ${path}:`, error);
        }
      },
    }),
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
