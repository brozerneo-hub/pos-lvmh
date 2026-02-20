import { Router, type IRouter } from 'express';
import { login, refresh, logout } from '@/services/auth.service';
import { authenticate } from '@/middleware/authenticate';
import { validate } from '@/middleware/validate';
import { authLimiter } from '@/middleware/rateLimiter';
import { LoginSchema } from '@pos-lvmh/shared';

export const authRouter: IRouter = Router();

authRouter.post('/login', authLimiter, validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await login(email, password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token =
      (req.cookies?.['refreshToken'] as string | undefined) ??
      (req.headers['x-refresh-token'] as string | undefined);

    if (!token) throw new Error('No refresh token');

    const { accessToken } = await refresh(token);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    await logout(req.user!.sub);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
