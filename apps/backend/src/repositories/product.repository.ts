import { getFirestore } from '@/config/firebase';
import type { ProductCategory } from '@pos-lvmh/shared';

export interface ProductDoc {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  priceHT: number;
  vatRate: number;
  imageUrl: string | null;
  isActive: boolean;
}

export async function listProducts(filters?: {
  category?: ProductCategory;
  search?: string;
}): Promise<ProductDoc[]> {
  const snap = await getFirestore().collection('products').where('isActive', '==', true).get();

  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProductDoc);

  if (filters?.category) {
    docs = docs.filter((p) => p.category === filters.category);
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    docs = docs.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s) ||
        p.brand.toLowerCase().includes(s),
    );
  }

  return docs;
}
