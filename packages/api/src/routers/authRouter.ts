import { config, session } from '../config';
import { errorCodes, errorReasons } from '../constants';
import { ApiError } from '../errors';
import { loginInputSchema } from '../schemas/auth';
import { authenticate, createAccessToken } from '../services/authService';
import { authenticatedProcedure, publicProcedure, router } from '../trpc';

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict',
  path: '/',
} as const;

export const authRouter = router({
  login: publicProcedure.input(loginInputSchema).mutation(async ({ input, ctx }) => {
    const user = await authenticate(input.username, input.password);
    if (!user) {
      throw new ApiError({
        code: errorCodes.unauthorized,
        reason: errorReasons.invalidCredentials,
        message: 'Invalid username or password',
      });
    }
    const { token, csrfToken } = await createAccessToken(user);
    ctx.res.cookie(session.cookieName, token, {
      ...cookieOptions,
      maxAge: session.lifetimeSeconds * 1000,
    });
    return { username: user.username, csrfToken };
  }),
  logout: authenticatedProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(session.cookieName, cookieOptions);
    return { success: true };
  }),
  // Public so that checking for a session when logged out is a normal 200, not a 401
  session: publicProcedure.query(({ ctx }) => ({
    csrfToken: ctx.claims?.csrfToken ?? null,
  })),
});
