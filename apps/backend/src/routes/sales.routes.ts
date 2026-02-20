import { Router, type IRouter } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { createSale } from '@/services/sale.service';

export const salesRouter: IRouter = Router();

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
