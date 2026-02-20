import * as admin from 'firebase-admin';
import { v4 as uuid } from 'uuid';
import { getFirestore } from '@/config/firebase';
import { SaleStatus } from '@pos-lvmh/shared';
import type { PaymentMethod, CartLine, PaymentDetails } from '@pos-lvmh/shared';

export interface CreateSaleInput {
  storeId: string;
  cashierId: string;
  lines: CartLine[];
  paymentMode: PaymentMethod;
  paymentDetails: PaymentDetails;
  clientId?: string;
}

export async function createSale(input: CreateSaleInput): Promise<{ saleId: string }> {
  const { storeId, cashierId, lines, paymentMode, paymentDetails, clientId } = input;

  const totalHT = lines.reduce((s, l) => s + l.lineHT, 0);
  const totalVAT = lines.reduce((s, l) => s + l.lineVAT, 0);
  const totalTTC = lines.reduce((s, l) => s + l.lineTTC, 0);
  const totalDiscount = lines.reduce((s, l) => s + l.discountAmount, 0);

  const saleId = uuid();
  const now = admin.firestore.Timestamp.now();
  const db = getFirestore();
  const batch = db.batch();

  batch.set(db.collection('sales').doc(saleId), {
    storeId,
    cashierId,
    clientId: clientId ?? null,
    date: now,
    status: SaleStatus.COMPLETED,
    totalHT,
    totalVAT,
    totalTTC,
    totalDiscount,
    paymentMode,
    paymentDetails,
    ticketUrl: null,
    syncedFromOffline: false,
    lines: lines.map((l, i) => ({ id: String(i + 1), ...l })),
    createdAt: now,
  });

  for (const line of lines) {
    const stockRef = db.collection('stores').doc(storeId).collection('stock').doc(line.productId);
    batch.update(stockRef, {
      quantity: admin.firestore.FieldValue.increment(-line.quantity),
      updatedAt: now,
    });
  }

  await batch.commit();
  return { saleId };
}
