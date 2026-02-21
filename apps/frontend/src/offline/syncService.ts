import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { QueryClient } from '@tanstack/react-query';
import { db } from './db';
import { api } from '@/services/api';

export function usePendingCount(): number {
  return useLiveQuery(() => db.offlineSales.where('synced').equals(0).count(), [], 0);
}

export async function syncPendingSales(queryClient: QueryClient): Promise<number> {
  const pending = await db.offlineSales.where('synced').equals(0).toArray();
  if (pending.length === 0) return 0;

  let syncedCount = 0;
  for (const sale of pending) {
    try {
      await api.post('/sales', {
        lines: sale.lines,
        paymentMode: sale.paymentMode,
        paymentDetails: sale.paymentDetails,
      });
      await db.offlineSales.update(sale.id!, { synced: true, syncedAt: Date.now() });
      syncedCount++;
    } catch {
      // On laisse pour la prochaine tentative
    }
  }

  if (syncedCount > 0) {
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
  }

  return syncedCount;
}

export function useSyncOnReconnect(queryClient: QueryClient) {
  useEffect(() => {
    const handleOnline = () => {
      void syncPendingSales(queryClient);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);
}
