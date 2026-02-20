import { verifyPassword } from '@/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/token';
import { AppError, ErrorCode } from '@/utils/errors';
import { findByEmail, updateLoginAttempts, recordLogin } from '@/repositories/user.repository';
import { getFirestore } from '@/config/firebase';
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from '@pos-lvmh/shared';
import { v4 as uuid } from 'uuid';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    storeId: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findByEmail(email.toLowerCase());

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  // Vérif verrouillage
  if (user.lockedUntil) {
    const lockedMs = user.lockedUntil.toMillis();
    if (Date.now() < lockedMs) {
      const remainMin = Math.ceil((lockedMs - Date.now()) / 60000);
      throw new AppError(
        `Account locked. Try again in ${remainMin} min`,
        403,
        ErrorCode.ACCOUNT_LOCKED,
      );
    }
  }

  const valid = await verifyPassword(user.passwordHash, password);

  if (!valid) {
    const attempts = user.loginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;
    await updateLoginAttempts(user.id, attempts, lockedUntil);
    throw new AppError('Invalid credentials', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  await recordLogin(user.id);

  const jti = uuid();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
  });
  const refreshToken = signRefreshToken(user.id, jti);

  // Stocker le jti en Firestore pour permettre la révocation
  await getFirestore()
    .collection('refreshTokens')
    .doc(jti)
    .set({
      userId: user.id,
      createdAt: FirebaseFirestore.Timestamp.now(),
      expiresAt: FirebaseFirestore.Timestamp.fromDate(new Date(Date.now() + 8 * 60 * 60 * 1000)),
    });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      storeId: user.storeId,
    },
  };
}

export async function refresh(token: string): Promise<{ accessToken: string }> {
  const payload = verifyRefreshToken(token);

  const doc = await getFirestore().collection('refreshTokens').doc(payload.jti).get();
  if (!doc.exists) {
    throw new AppError('Refresh token revoked', 401, ErrorCode.TOKEN_REVOKED);
  }

  const userDoc = await getFirestore().collection('users').doc(payload.sub).get();
  if (!userDoc.exists) throw AppError.unauthorized();

  const userData = userDoc.data()!;
  const accessToken = signAccessToken({
    sub: payload.sub,
    email: userData['email'] as string,
    role: userData['role'] as never,
    storeId: userData['storeId'] as string,
  });

  return { accessToken };
}

export async function logout(userId: string): Promise<void> {
  // Révoquer tous les refresh tokens de l'utilisateur
  const snap = await getFirestore().collection('refreshTokens').where('userId', '==', userId).get();

  const batch = getFirestore().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));

  // Marquer les access tokens comme révoqués
  batch.set(getFirestore().collection('revokedTokens').doc(userId), {
    revokedAt: Math.floor(Date.now() / 1000),
  });

  await batch.commit();
}
