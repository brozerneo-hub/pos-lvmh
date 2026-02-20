import { Router, type IRouter } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { listProducts } from '@/repositories/product.repository';
import type { ProductCategory } from '@pos-lvmh/shared';

export const productsRouter: IRouter = Router();

productsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filters: { category?: ProductCategory; search?: string } = {};
    if (category) filters.category = category as ProductCategory;
    if (search) filters.search = search as string;
    const products = await listProducts(filters);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});
