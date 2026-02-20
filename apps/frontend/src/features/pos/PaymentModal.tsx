import { useState } from 'react';
import { X, CreditCard, Banknote } from 'lucide-react';
import { PaymentMethod } from '@pos-lvmh/shared';
import type { CartTotals } from '@pos-lvmh/shared';

interface Props {
  totals: CartTotals;
  onConfirm: (mode: PaymentMethod, cashAmount?: number) => void;
  onClose: () => void;
  isLoading: boolean;
}

const fmt = (c: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

export function PaymentModal({ totals, onConfirm, onClose, isLoading }: Props) {
  const [mode, setMode] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [cashInput, setCashInput] = useState('');

  const cashAmount = Math.round(parseFloat(cashInput || '0') * 100);
  const change = cashAmount - totals.totalTTC;

  const canConfirm =
    mode === PaymentMethod.CARD || (mode === PaymentMethod.CASH && cashAmount >= totals.totalTTC);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-luxury shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-luxury-900">Paiement</h2>
          <button onClick={onClose} className="text-luxury-400 hover:text-luxury-700">
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-luxury-500 text-sm">Total TTC</p>
          <p className="font-display text-4xl text-luxury-900 mt-1">{fmt(totals.totalTTC)}</p>
        </div>

        <div className="flex gap-3 mb-6">
          {[PaymentMethod.CARD, PaymentMethod.CASH].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-luxury border-2 transition-colors ${
                mode === m
                  ? 'border-gold-600 bg-gold-50 text-gold-700'
                  : 'border-luxury-200 text-luxury-500 hover:border-luxury-400'
              }`}
            >
              {m === PaymentMethod.CARD ? <CreditCard size={24} /> : <Banknote size={24} />}
              <span className="text-sm font-medium">
                {m === PaymentMethod.CARD ? 'Carte' : 'Espèces'}
              </span>
            </button>
          ))}
        </div>

        {mode === PaymentMethod.CASH && (
          <div className="mb-6">
            <label className="text-sm text-luxury-600 mb-1 block">Montant remis (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              className="w-full border border-luxury-200 rounded-luxury px-4 py-3 text-xl text-center focus:outline-none focus:border-gold-500"
              placeholder="0,00"
              autoFocus
            />
            {cashAmount >= totals.totalTTC && (
              <p className="text-center mt-3 text-luxury-700">
                Rendu monnaie : <span className="font-semibold text-gold-700">{fmt(change)}</span>
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => onConfirm(mode, mode === PaymentMethod.CASH ? cashAmount : undefined)}
          disabled={!canConfirm || isLoading}
          className="w-full bg-gold-600 hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-luxury transition-colors text-lg"
        >
          {isLoading ? 'Traitement…' : 'Valider le paiement'}
        </button>
      </div>
    </div>
  );
}
