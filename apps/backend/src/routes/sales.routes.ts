import { Router, type IRouter } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { createSale } from '@/services/sale.service';
import { getFirestore } from '@/config/firebase';

export const salesRouter: IRouter = Router();

salesRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const snap = await getFirestore()
      .collection('sales')
      .where('storeId', '==', req.user!.storeId)
      .orderBy('date', 'desc')
      .limit(50)
      .get();
    const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
});

salesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const result = await createSale({
      ...req.body,
      cashierId: req.user!.sub,
      storeId: req.user!.storeId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
