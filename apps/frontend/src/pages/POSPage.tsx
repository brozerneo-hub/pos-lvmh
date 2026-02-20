import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { ProductCategory, PaymentMethod } from '@pos-lvmh/shared';
import { useCartStore } from '@/stores/cartStore';
import { PaymentModal } from '@/features/pos/PaymentModal';
import { api } from '@/services/api';

interface ProductDoc {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  priceHT: number;
  vatRate: number;
  imageUrl: string | null;
}

const CATEGORIES = [
  { value: '', label: 'Tous' },
  { value: ProductCategory.CLOTHING, label: 'Mode' },
  { value: ProductCategory.WATCHES, label: 'Montres' },
  { value: ProductCategory.PERFUME, label: 'Parfums' },
];

const fmt = (c: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const { lines, add, remove, setQty, clear, totals } = useCartStore();
  const t = totals();

  const { data: products = [], isLoading } = useQuery<ProductDoc[]>({
    queryKey: ['products', category, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      const res = await api.get<{ data: ProductDoc[] }>(`/products?${params}`);
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const saleMutation = useMutation({
    mutationFn: (vars: { mode: PaymentMethod; cashAmount?: number }) =>
      api.post('/sales', {
        lines,
        paymentMode: vars.mode,
        paymentDetails:
          vars.mode === PaymentMethod.CASH
            ? { cashAmount: vars.cashAmount, changeGiven: (vars.cashAmount ?? 0) - t.totalTTC }
            : {},
      }),
    onSuccess: () => {
      clear();
      setShowPayment(false);
    },
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-luxury-50">
      {/* ── Catalogue ── */}
      <div className="flex flex-col flex-1 overflow-hidden border-r border-luxury-200">
        {/* Search + filters */}
        <div className="bg-white px-6 py-4 border-b border-luxury-200 space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-400"
            />
            <input
              type="text"
              placeholder="Rechercher produit, SKU, marque…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-luxury-200 rounded-luxury text-sm focus:outline-none focus:border-gold-500"
            />
          </div>
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === c.value
                    ? 'bg-gold-600 text-white'
                    : 'bg-luxury-100 text-luxury-600 hover:bg-luxury-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-luxury-400">
              Chargement…
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-full text-luxury-400">
              Aucun produit trouvé
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {products.map((p) => {
                const priceTTC = Math.round(p.priceHT * (1 + p.vatRate / 100));
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      add({
                        productId: p.id,
                        productName: p.name,
                        productSku: p.sku,
                        imageUrl: p.imageUrl,
                        unitPriceHT: p.priceHT,
                        vatRate: p.vatRate,
                      })
                    }
                    className="bg-white rounded-luxury border border-luxury-200 p-4 text-left hover:border-gold-400 hover:shadow-md transition-all group"
                  >
                    <div className="h-24 bg-luxury-100 rounded mb-3 flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-luxury-300 text-xs">Sans image</span>
                      )}
                    </div>
                    <p className="text-xs text-luxury-400 mb-0.5">{p.brand}</p>
                    <p className="text-sm font-medium text-luxury-800 leading-tight line-clamp-2 mb-2">
                      {p.name}
                    </p>
                    <p className="font-display text-gold-700 font-semibold">{fmt(priceTTC)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Panier ── */}
      <div className="w-80 xl:w-96 flex flex-col bg-white">
        <div className="px-6 py-4 border-b border-luxury-200 flex items-center gap-2">
          <ShoppingCart size={18} className="text-luxury-600" />
          <h2 className="font-display text-lg text-luxury-900">Panier</h2>
          {lines.length > 0 && (
            <span className="ml-auto text-xs bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full font-medium">
              {lines.reduce((s, l) => s + l.quantity, 0)} art.
            </span>
          )}
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {lines.length === 0 ? (
            <p className="text-center text-luxury-400 text-sm mt-8">Panier vide</p>
          ) : (
            lines.map((l) => (
              <div key={l.productId} className="py-3 border-b border-luxury-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-luxury-800 truncate">{l.productName}</p>
                    <p className="text-xs text-luxury-400">{l.productSku}</p>
                  </div>
                  <button
                    onClick={() => remove(l.productId)}
                    className="text-luxury-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(l.productId, l.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-luxury-200 hover:border-gold-400 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{l.quantity}</span>
                    <button
                      onClick={() => setQty(l.productId, l.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-luxury-200 hover:border-gold-400 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-luxury-800">{fmt(l.lineTTC)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-luxury-200 px-6 py-4 space-y-2">
          <div className="flex justify-between text-sm text-luxury-500">
            <span>Total HT</span>
            <span>{fmt(t.totalHT)}</span>
          </div>
          <div className="flex justify-between text-sm text-luxury-500">
            <span>TVA</span>
            <span>{fmt(t.totalVAT)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-luxury-900 pt-2 border-t border-luxury-100">
            <span>Total TTC</span>
            <span className="font-display text-gold-700">{fmt(t.totalTTC)}</span>
          </div>

          <button
            onClick={() => setShowPayment(true)}
            disabled={lines.length === 0}
            className="w-full mt-3 bg-gold-600 hover:bg-gold-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-luxury transition-colors"
          >
            Procéder au paiement
          </button>
          {lines.length > 0 && (
            <button
              onClick={clear}
              className="w-full text-luxury-400 hover:text-red-500 text-sm py-1 transition-colors"
            >
              Vider le panier
            </button>
          )}
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          totals={t}
          onClose={() => setShowPayment(false)}
          onConfirm={(mode, cashAmount) =>
            saleMutation.mutate(cashAmount !== undefined ? { mode, cashAmount } : { mode })
          }
          isLoading={saleMutation.isPending}
        />
      )}
    </div>
  );
}
