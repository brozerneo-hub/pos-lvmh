import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/services/api';

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  totalSpent: number;
  totalPurchases: number;
}

const fmt = (c: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const { data: clients = [], isLoading } = useQuery<ClientRow[]>({
    queryKey: ['clients', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get<{ data: ClientRow[] }>(`/clients${params}`);
      return res.data.data;
    },
    staleTime: 60_000,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-luxury-900">Clients</h1>
          <p className="text-luxury-500 text-sm mt-1">{clients.length} client(s)</p>
        </div>
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-400" />
          <input
            type="text"
            placeholder="Nom, prénom, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-luxury-200 rounded-luxury text-sm focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-luxury shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-luxury-100 bg-luxury-50">
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Client</th>
              <th className="text-left px-6 py-3 text-luxury-500 font-medium">Contact</th>
              <th className="text-center px-6 py-3 text-luxury-500 font-medium">Nationalité</th>
              <th className="text-right px-6 py-3 text-luxury-500 font-medium">Achats</th>
              <th className="text-right px-6 py-3 text-luxury-500 font-medium">Total dépensé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-luxury-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-luxury-400">
                  Chargement…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-luxury-400">
                  Aucun client trouvé
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-luxury-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-luxury-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-6 py-4 text-luxury-500">
                    <p>{c.email}</p>
                    <p className="text-xs">{c.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-luxury-600">{c.nationality}</td>
                  <td className="px-6 py-4 text-right text-luxury-600">{c.totalPurchases}</td>
                  <td className="px-6 py-4 text-right font-semibold text-luxury-900">
                    {fmt(c.totalSpent)}
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
