import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { LOW_STOCK_THRESHOLD } from '@pos-lvmh/shared';
import { api } from '@/services/api';

interface StockRow {
  id: string;
  productName: string;
  productSku: string;
  brand: string;
  quantity: number;
  minQuantity: number;
}

export default function StockPage() {
  const { data: stock = [], isLoading } = useQuery<StockRow[]>({
    queryKey: ['stock'],
    queryFn: async () => {
      const res = await api.get<{ data: StockRow[] }>('/stock');
      return res.data.data;
    },
  });

  const lowStock = stock.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-luxury-900">Stock</h1>
        <p className="text-luxury-500 text-sm mt-1">{stock.length} référence(s)</p>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-luxury px-4 py-3 text-sm text-orange-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{lowStock.length}</strong> référence(s) en stock bas (≤ {LOW_STOCK_THRESHOLD}{' '}
            unités)
          </span>
        </div>
      )}

      <div className="bg-white rounded-luxury shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-luxury-100 bg-luxury-50">
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Produit</th>
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Marque</th>
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">SKU</th>
              <th className="text-right px-6 py-3 text-luxury-500 font-medium">Quantité</th>
              <th className="text-right px-6 py-3 text-luxury-500 font-medium">Minimum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-luxury-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-luxury-400">
                  Chargement…
                </td>
              </tr>
            ) : stock.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-luxury-400">
                  Aucune donnée de stock
                </td>
              </tr>
            ) : (
              stock.map((s) => {
                const isLow = s.quantity <= LOW_STOCK_THRESHOLD;
                return (
                  <tr key={s.id} className="hover:bg-luxury-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-luxury-900">{s.productName}</td>
                    <td className="px-6 py-4 text-luxury-500">{s.brand}</td>
                    <td className="px-6 py-4 text-luxury-400 font-mono text-xs">{s.productSku}</td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-semibold ${isLow ? 'text-orange-600' : 'text-luxury-900'}`}
                      >
                        {s.quantity}
                        {isLow && (
                          <AlertTriangle size={12} className="inline ml-1 mb-0.5 text-orange-500" />
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-luxury-500">{s.minQuantity}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
