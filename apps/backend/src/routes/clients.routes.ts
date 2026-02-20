import { Router, type IRouter } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { getFirestore } from '@/config/firebase';

export const clientsRouter: IRouter = Router();

clientsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const { search } = req.query;
    const snap = await getFirestore().collection('clients').orderBy('lastName').limit(100).get();
    let clients = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];
    if (search) {
      const s = (search as string).toLowerCase();
      clients = clients.filter((c) => {
        const full = `${c['firstName']} ${c['lastName']} ${c['email']}`.toLowerCase();
        return full.includes(s);
      });
    }
    res.json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
});
