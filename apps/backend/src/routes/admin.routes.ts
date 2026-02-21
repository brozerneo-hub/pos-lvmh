import { Router, type IRouter } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { getFirestore } from '@/config/firebase';
import * as admin from 'firebase-admin';
import { UserRole } from '@pos-lvmh/shared';
import { v4 as uuid } from 'uuid';

export const adminRouter: IRouter = Router();

const guard = [authenticate, authorize(UserRole.MANAGER)];

// List all products (incl. inactive)
adminRouter.get('/products', ...guard, async (_req, res, next) => {
  try {
    const snap = await getFirestore().collection('products').orderBy('brand').get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

// Create product
adminRouter.post('/products', ...guard, async (req, res, next) => {
  try {
    const id = uuid();
    const now = admin.firestore.Timestamp.now();
    const data = {
      ...req.body,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.sub ?? '',
    };
    await getFirestore().collection('products').doc(id).set(data);
    res.status(201).json({ success: true, data: { id, ...data } });
  } catch (err) {
    next(err);
  }
});

// Update product
adminRouter.patch('/products/:id', ...guard, async (req, res, next) => {
  try {
    const now = admin.firestore.Timestamp.now();
    await getFirestore()
      .collection('products')
      .doc(req.params['id'] as string)
      .update({ ...req.body, updatedAt: now });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Toggle active
adminRouter.patch('/products/:id/toggle', ...guard, async (req, res, next) => {
  try {
    const ref = getFirestore()
      .collection('products')
      .doc(req.params['id'] as string);
    const doc = await ref.get();
    if (!doc.exists) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      return;
    }
    const isActive = !(doc.data()?.['isActive'] as boolean);
    await ref.update({ isActive, updatedAt: admin.firestore.Timestamp.now() });
    res.json({ success: true, data: { isActive } });
  } catch (err) {
    next(err);
  }
});
