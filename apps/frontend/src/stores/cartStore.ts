import { create } from 'zustand';
import type { CartLine, CartTotals } from '@pos-lvmh/shared';

interface ProductInput {
  productId: string;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  unitPriceHT: number;
  vatRate: number;
}

function buildLine(p: ProductInput, quantity: number): CartLine {
  const lineHT = p.unitPriceHT * quantity;
  const lineVAT = Math.round(lineHT * (p.vatRate / 100));
  return { ...p, quantity, discountAmount: 0, lineHT, lineVAT, lineTTC: lineHT + lineVAT };
}

interface CartState {
  lines: CartLine[];
  add: (product: ProductInput) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  totals: () => CartTotals;
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],

  add: (product) =>
    set((state) => {
      const existing = state.lines.find((l) => l.productId === product.productId);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === product.productId ? buildLine(product, l.quantity + 1) : l,
          ),
        };
      }
      return { lines: [...state.lines, buildLine(product, 1)] };
    }),

  remove: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

  setQty: (productId, qty) =>
    set((state) => ({
      lines:
        qty <= 0
          ? state.lines.filter((l) => l.productId !== productId)
          : state.lines.map((l) =>
              l.productId === productId ? buildLine({ ...l, unitPriceHT: l.unitPriceHT }, qty) : l,
            ),
    })),

  clear: () => set({ lines: [] }),

  totals: (): CartTotals => {
    const { lines } = get();
    const vatBreakdown: Record<string, { base: number; vat: number }> = {};
    for (const l of lines) {
      const key = String(l.vatRate);
      if (!vatBreakdown[key]) vatBreakdown[key] = { base: 0, vat: 0 };
      vatBreakdown[key]!.base += l.lineHT;
      vatBreakdown[key]!.vat += l.lineVAT;
    }
    return {
      totalHT: lines.reduce((s, l) => s + l.lineHT, 0),
      totalVAT: lines.reduce((s, l) => s + l.lineVAT, 0),
      totalTTC: lines.reduce((s, l) => s + l.lineTTC, 0),
      totalDiscount: 0,
      vatBreakdown,
    };
  },
}));
