import Dexie, { type Table } from 'dexie';
import type { CartLine, PaymentMethod, PaymentDetails } from '@pos-lvmh/shared';

export interface OfflineSale {
  id?: number;
  localId: string;
  storeId: string;
  cashierId: string;
  lines: CartLine[];
  paymentMode: PaymentMethod;
  paymentDetails: PaymentDetails;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  createdAt: number;
  synced: boolean;
  syncedAt?: number;
}

class POSDatabase extends Dexie {
  offlineSales!: Table<OfflineSale>;

  constructor() {
    super('pos-lvmh-db');
    this.version(1).stores({
      offlineSales: '++id, localId, synced, createdAt',
    });
  }
}

export const db = new POSDatabase();
