import { Router, type IRouter } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { getFirestore } from '@/config/firebase';

export const stockRouter: IRouter = Router();

stockRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const storeId = req.user!.storeId;
    const [stockSnap, productsSnap] = await Promise.all([
      getFirestore().collection('stores').doc(storeId).collection('stock').get(),
      getFirestore().collection('products').where('isActive', '==', true).get(),
    ]);

    const productsMap = new Map(
      productsSnap.docs.map((d) => [
        d.id,
        d.data() as { name: string; sku: string; brand: string },
      ]),
    );

    const stock = stockSnap.docs.map((d) => {
      const product = productsMap.get(d.id);
      return {
        id: d.id,
        ...d.data(),
        productName: product?.name,
        productSku: product?.sku,
        brand: product?.brand,
      };
    });

    res.json({ success: true, data: stock });
  } catch (err) {
    next(err);
  }
});
