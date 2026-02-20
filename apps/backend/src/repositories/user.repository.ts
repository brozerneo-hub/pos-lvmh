import { getFirestore } from '@/config/firebase';
import type { UserRole } from '@pos-lvmh/shared';

export interface UserDoc {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  storeId: string;
  passwordHash: string;
  isActive: boolean;
  loginAttempts: number;
  lockedUntil: FirebaseFirestore.Timestamp | null;
}

const col = () => getFirestore().collection('users');

export async function findByEmail(email: string): Promise<UserDoc | null> {
  const snap = await col().where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<UserDoc, 'id'>) };
}

export async function updateLoginAttempts(
  userId: string,
  attempts: number,
  lockedUntil: Date | null = null,
): Promise<void> {
  await col()
    .doc(userId)
    .update({
      loginAttempts: attempts,
      lockedUntil: lockedUntil ? FirebaseFirestore.Timestamp.fromDate(lockedUntil) : null,
      updatedAt: FirebaseFirestore.Timestamp.now(),
    });
}

export async function recordLogin(userId: string): Promise<void> {
  await col().doc(userId).update({
    loginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: FirebaseFirestore.Timestamp.now(),
    updatedAt: FirebaseFirestore.Timestamp.now(),
  });
}
