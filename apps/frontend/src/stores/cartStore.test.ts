import { beforeEach, describe, expect, it } from 'vitest';

import { useCartStore } from './cartStore';

const PRODUCT_A = {
  productId: 'prod-a',
  productName: 'Montre Classique',
  productSku: 'SKU-001',
  imageUrl: null,
  unitPriceHT: 1000,
  vatRate: 20,
};

const PRODUCT_B = {
  productId: 'prod-b',
  productName: 'Parfum Luxe',
  productSku: 'SKU-002',
  imageUrl: 'https://example.com/img.jpg',
  unitPriceHT: 5000,
  vatRate: 5,
};

beforeEach(() => {
  useCartStore.setState({ lines: [] });
});

describe('add', () => {
  it('ajoute un nouveau produit avec quantite 1', () => {
    useCartStore.getState().add(PRODUCT_A);
    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe('prod-a');
    expect(lines[0]?.quantity).toBe(1);
  });

  it('incremente la quantite si le produit existe deja', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_A);
    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
  });

  it('ajoute un deuxieme produit distinct', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_B);
    expect(useCartStore.getState().lines).toHaveLength(2);
  });

  it('calcule correctement lineHT, lineVAT, lineTTC', () => {
    useCartStore.getState().add(PRODUCT_A);
    const line = useCartStore.getState().lines[0]!;
    expect(line.lineHT).toBe(1000);
    expect(line.lineVAT).toBe(200);
    expect(line.lineTTC).toBe(1200);
  });

  it('recalcule les montants lors du doublement de quantite', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_A);
    const line = useCartStore.getState().lines[0]!;
    expect(line.quantity).toBe(2);
    expect(line.lineHT).toBe(2000);
    expect(line.lineVAT).toBe(400);
    expect(line.lineTTC).toBe(2400);
  });

  it('initialise discountAmount a 0', () => {
    useCartStore.getState().add(PRODUCT_A);
    expect(useCartStore.getState().lines[0]?.discountAmount).toBe(0);
  });
});

describe('remove', () => {
  it('supprime la ligne correspondant au productId', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_B);
    useCartStore.getState().remove('prod-a');
    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe('prod-b');
  });

  it("ne fait rien si le productId n'existe pas", () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().remove('prod-inexistant');
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('vide le panier si seule ligne supprimee', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().remove('prod-a');
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});

describe('setQty', () => {
  it('met a jour la quantite et recalcule les montants', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().setQty('prod-a', 3);
    const line = useCartStore.getState().lines[0]!;
    expect(line.quantity).toBe(3);
    expect(line.lineHT).toBe(3000);
    expect(line.lineVAT).toBe(600);
    expect(line.lineTTC).toBe(3600);
  });

  it('supprime la ligne si qty === 0', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().setQty('prod-a', 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('supprime la ligne si qty < 0', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().setQty('prod-a', -1);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it("ne modifie pas les autres lignes lors d'un setQty", () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_B);
    useCartStore.getState().setQty('prod-a', 5);
    const lineB = useCartStore.getState().lines.find((l) => l.productId === 'prod-b');
    expect(lineB?.quantity).toBe(1);
  });
});

describe('clear', () => {
  it('vide toutes les lignes', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_B);
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('fonctionne sur un panier deja vide', () => {
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});

describe('totals', () => {
  it('retourne des zeros pour un panier vide', () => {
    const totals = useCartStore.getState().totals();
    expect(totals.totalHT).toBe(0);
    expect(totals.totalVAT).toBe(0);
    expect(totals.totalTTC).toBe(0);
    expect(totals.totalDiscount).toBe(0);
    expect(totals.vatBreakdown).toEqual({});
  });

  it('calcule correctement les totaux avec un produit', () => {
    useCartStore.getState().add(PRODUCT_A);
    const totals = useCartStore.getState().totals();
    expect(totals.totalHT).toBe(1000);
    expect(totals.totalVAT).toBe(200);
    expect(totals.totalTTC).toBe(1200);
  });

  it('additionne correctement plusieurs lignes', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_B);
    const totals = useCartStore.getState().totals();
    expect(totals.totalHT).toBe(6000);
    expect(totals.totalVAT).toBe(450);
    expect(totals.totalTTC).toBe(6450);
  });

  it('genere un vatBreakdown par taux distinct', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_B);
    const { vatBreakdown } = useCartStore.getState().totals();
    expect(vatBreakdown['20']).toEqual({ base: 1000, vat: 200 });
    expect(vatBreakdown['5']).toEqual({ base: 5000, vat: 250 });
  });

  it('agregge dans le meme taux deux produits identiques', () => {
    useCartStore.getState().add(PRODUCT_A);
    useCartStore.getState().add(PRODUCT_A);
    const { vatBreakdown } = useCartStore.getState().totals();
    expect(vatBreakdown['20']).toEqual({ base: 2000, vat: 400 });
    expect(Object.keys(vatBreakdown)).toHaveLength(1);
  });

  it('totalDiscount est toujours 0', () => {
    useCartStore.getState().add(PRODUCT_A);
    expect(useCartStore.getState().totals().totalDiscount).toBe(0);
  });
});

describe('arrondi TVA (Math.round)', () => {
  it('arrondit correctement la TVA au centime', () => {
    const product = { ...PRODUCT_A, unitPriceHT: 333, vatRate: 20 };
    useCartStore.getState().add(product);
    const line = useCartStore.getState().lines[0]!;
    expect(line.lineVAT).toBe(67);
    expect(line.lineTTC).toBe(333 + 67);
  });
});
