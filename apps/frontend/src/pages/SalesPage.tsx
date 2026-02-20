import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { PaymentMethod, SaleStatus } from '@pos-lvmh/shared';

interface SaleRow {
  id: string;
  date: { _seconds: number };
  totalTTC: number;
  paymentMode: PaymentMethod;
  status: SaleStatus;
  lines: { quantity: number }[];
}

const fmt = (c: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

const fmtDate = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Espèces',
  [PaymentMethod.CARD]: 'Carte',
  [PaymentMethod.MOBILE]: 'Mobile',
  [PaymentMethod.MIXED]: 'Mixte',
};

const STATUS_CLASS: Record<SaleStatus, string> = {
  [SaleStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [SaleStatus.CANCELLED]: 'bg-red-100 text-red-700',
  [SaleStatus.RETURNED]: 'bg-orange-100 text-orange-700',
  [SaleStatus.PENDING_SYNC]: 'bg-yellow-100 text-yellow-700',
};

export default function SalesPage() {
  const { data: sales = [], isLoading } = useQuery<SaleRow[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await api.get<{ data: SaleRow[] }>('/sales');
      return res.data.data;
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-luxury-900">Ventes</h1>
        <p className="text-luxury-500 text-sm mt-1">{sales.length} vente(s) récente(s)</p>
      </div>

      <div className="bg-white rounded-luxury shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-luxury-100 bg-luxury-50">
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Date</th>
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Articles</th>
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Paiement</th>
              <th className="text-right px-6 py-3 text-luxury-500 font-medium">Total TTC</th>
              <th className="text-center px-6 py-3 text-luxury-500 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-luxury-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-luxury-400">
                  Chargement…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-luxury-400">
                  Aucune vente enregistrée
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id} className="hover:bg-luxury-50 transition-colors">
                  <td className="px-6 py-4 text-luxury-700">{fmtDate(s.date._seconds)}</td>
                  <td className="px-6 py-4 text-luxury-600">
                    {s.lines.reduce((t, l) => t + l.quantity, 0)} art.
                  </td>
                  <td className="px-6 py-4 text-luxury-600">{PAYMENT_LABEL[s.paymentMode]}</td>
                  <td className="px-6 py-4 text-right font-semibold text-luxury-900">
                    {fmt(s.totalTTC)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
