import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { allowedMethods, config, limits } from '../config';

export const securityHeaders = helmet();

export const corsPolicy = cors({
  origin: config.clientOrigin,
  credentials: true,
  methods: allowedMethods,
  allowedHeaders: ['content-type', 'x-csrf-token'],
  maxAge: 600,
});

export const parseCookies = cookieParser();

export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

export const restrictMethods: RequestHandler = (req, res, next) => {
  if (!allowedMethods.includes(req.method)) {
    res.set('Allow', allowedMethods.join(', '));
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  next();
};

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: limits.requestsPerMinute,
});

export const loginRateLimit = rateLimit({
  windowMs: limits.loginWindowMs,
  limit: limits.loginAttemptsPerWindow,
});

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler: ErrorRequestHandler = (error: { status?: number; statusCode?: number }, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = error.status ?? error.statusCode ?? 500;
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : 'Bad request',
  });
};
