import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { ProductCategory } from '@pos-lvmh/shared';
import { api } from '@/services/api';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  priceHT: number;
  vatRate: number;
  isActive: boolean;
}

const schema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.nativeEnum(ProductCategory),
  priceHT: z.coerce.number().min(1),
  vatRate: z.coerce.number().min(0).max(100),
});
type FormData = z.infer<typeof schema>;

const fmt = (c: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

const CAT_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.CLOTHING]: 'Mode',
  [ProductCategory.WATCHES]: 'Montres',
  [ProductCategory.PERFUME]: 'Parfums',
};

export default function ProductsAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<ProductRow[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get<{ data: ProductRow[] }>('/admin/products');
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { vatRate: 20 },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/admin/products', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      reset();
      setShowForm(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/products/${id}/toggle`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-luxury-900">Produits</h1>
          <p className="text-luxury-500 text-sm mt-1">{products.length} référence(s)</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white font-semibold px-5 py-2.5 rounded-luxury transition-colors"
        >
          <Plus size={16} />
          Nouveau produit
        </button>
      </div>

      <div className="bg-white rounded-luxury shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-luxury-100 bg-luxury-50">
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Produit</th>
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">SKU</th>
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Catégorie</th>
              <th className="text-right px-6 py-3 text-luxury-500 font-medium">Prix HT</th>
              <th className="text-right px-6 py-3 text-luxury-500 font-medium">TVA</th>
              <th className="text-center px-6 py-3 text-luxury-500 font-medium">Actif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-luxury-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-luxury-400">
                  Chargement…
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-luxury-50 transition-colors ${!p.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-luxury-900">{p.name}</p>
                    <p className="text-xs text-luxury-400">{p.brand}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-luxury-400">{p.sku}</td>
                  <td className="px-6 py-4 text-luxury-600">{CAT_LABELS[p.category]}</td>
                  <td className="px-6 py-4 text-right text-luxury-800">{fmt(p.priceHT)}</td>
                  <td className="px-6 py-4 text-right text-luxury-500">{p.vatRate} %</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleMutation.mutate(p.id)}
                      disabled={toggleMutation.isPending}
                      className="text-luxury-400 hover:text-gold-600 transition-colors"
                    >
                      {p.isActive ? (
                        <ToggleRight size={22} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={22} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nouveau produit */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-luxury shadow-2xl w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-luxury-900">Nouveau produit</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-luxury-400 hover:text-luxury-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-luxury-600 mb-1 block">Nom *</label>
                  <input
                    {...register('name')}
                    className="w-full border border-luxury-200 rounded-luxury px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">Requis</p>}
                </div>
                <div>
                  <label className="text-sm text-luxury-600 mb-1 block">Marque *</label>
                  <input
                    {...register('brand')}
                    className="w-full border border-luxury-200 rounded-luxury px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  />
                  {errors.brand && <p className="text-red-500 text-xs mt-1">Requis</p>}
                </div>
                <div>
                  <label className="text-sm text-luxury-600 mb-1 block">SKU *</label>
                  <input
                    {...register('sku')}
                    className="w-full border border-luxury-200 rounded-luxury px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-luxury-600 mb-1 block">Catégorie *</label>
                  <select
                    {...register('category')}
                    className="w-full border border-luxury-200 rounded-luxury px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  >
                    {Object.values(ProductCategory).map((c) => (
                      <option key={c} value={c}>
                        {CAT_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-luxury-600 mb-1 block">Prix HT (centimes) *</label>
                  <input
                    type="number"
                    {...register('priceHT')}
                    placeholder="ex: 28000 = 280€"
                    className="w-full border border-luxury-200 rounded-luxury px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  />
                  {errors.priceHT && <p className="text-red-500 text-xs mt-1">Requis</p>}
                </div>
                <div>
                  <label className="text-sm text-luxury-600 mb-1 block">TVA (%) *</label>
                  <input
                    type="number"
                    {...register('vatRate')}
                    className="w-full border border-luxury-200 rounded-luxury px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 text-white font-semibold py-3 rounded-luxury transition-colors"
                >
                  {createMutation.isPending ? 'Création…' : 'Créer le produit'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-luxury-200 text-luxury-600 hover:bg-luxury-50 font-semibold py-3 rounded-luxury transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
