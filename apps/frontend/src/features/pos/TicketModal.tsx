import { X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import type { CartLine, PaymentMethod } from '@pos-lvmh/shared';

interface Props {
  saleId: string;
  lines: CartLine[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  paymentMode: PaymentMethod;
  onClose: () => void;
}

const fmt = (c: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  MOBILE: 'Paiement mobile',
  MIXED: 'Paiement mixte',
};

export function TicketModal({
  saleId,
  lines,
  totalHT,
  totalVAT,
  totalTTC,
  paymentMode,
  onClose,
}: Props) {
  const now = new Date().toLocaleString('fr-FR');
  const ticketRef = saleId.slice(0, 8).toUpperCase();

  function downloadPDF() {
    const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
    const lh = 5;
    let y = 8;

    const center = (text: string, yPos: number, size = 9) => {
      doc.setFontSize(size);
      const w = doc.getTextWidth(text);
      doc.text(text, (80 - w) / 2, yPos);
    };

    const line = (yPos: number) => {
      doc.setDrawColor(180);
      doc.line(4, yPos, 76, yPos);
    };

    // Header
    doc.setFont('helvetica', 'bold');
    center('LVMH', y, 14);
    y += 7;
    doc.setFont('helvetica', 'normal');
    center('Point de vente', y, 8);
    y += 5;
    center('22 Av. Montaigne, Paris', y, 7);
    y += 6;
    line(y);
    y += 4;

    doc.setFontSize(7);
    doc.text(`Ticket : ${ticketRef}`, 4, y);
    y += lh;
    doc.text(`Date   : ${now}`, 4, y);
    y += lh;
    doc.text(`Mode   : ${PAYMENT_LABEL[paymentMode]}`, 4, y);
    y += lh + 1;
    line(y);
    y += 4;

    // Lines
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Article', 4, y);
    doc.text('Qté', 52, y);
    doc.text('Total', 62, y);
    y += lh;
    doc.setFont('helvetica', 'normal');

    for (const l of lines) {
      const name = l.productName.length > 28 ? l.productName.slice(0, 27) + '…' : l.productName;
      doc.text(name, 4, y);
      doc.text(String(l.quantity), 52, y);
      doc.text(fmt(l.lineTTC), 62, y);
      y += lh;
    }

    y += 1;
    line(y);
    y += 4;

    // Totals
    doc.setFontSize(7);
    doc.text('Total HT', 4, y);
    doc.text(fmt(totalHT), 62, y);
    y += lh;
    doc.text('TVA', 4, y);
    doc.text(fmt(totalVAT), 62, y);
    y += lh + 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL TTC', 4, y);
    doc.text(fmt(totalTTC), 55, y);
    y += lh + 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    center('Merci de votre visite', y);
    y += lh;
    center('www.lvmh.com', y);

    doc.save(`ticket-${ticketRef}.pdf`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-luxury shadow-2xl w-full max-w-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-luxury-900">Vente validée</h2>
          <button onClick={onClose} className="text-luxury-400 hover:text-luxury-700">
            <X size={20} />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="bg-luxury-50 rounded-lg p-4 font-mono text-xs text-luxury-700 space-y-1 mb-6">
          <p className="text-center font-bold text-sm">LVMH · Point de vente</p>
          <p className="text-center text-luxury-400">{now}</p>
          <p className="text-center text-luxury-400">Réf. {ticketRef}</p>
          <hr className="border-luxury-200 my-2" />
          {lines.map((l) => (
            <div key={l.productId} className="flex justify-between gap-2">
              <span className="truncate flex-1">{l.productName}</span>
              <span className="shrink-0">x{l.quantity}</span>
              <span className="shrink-0 text-right w-20">{fmt(l.lineTTC)}</span>
            </div>
          ))}
          <hr className="border-luxury-200 my-2" />
          <div className="flex justify-between text-luxury-500">
            <span>HT</span>
            <span>{fmt(totalHT)}</span>
          </div>
          <div className="flex justify-between text-luxury-500">
            <span>TVA</span>
            <span>{fmt(totalVAT)}</span>
          </div>
          <div className="flex justify-between font-bold text-luxury-900 text-sm mt-1">
            <span>TOTAL TTC</span>
            <span>{fmt(totalTTC)}</span>
          </div>
          <p className="text-center text-luxury-400 pt-1">{PAYMENT_LABEL[paymentMode]}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={downloadPDF}
            className="flex-1 flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-700 text-white font-semibold py-3 rounded-luxury transition-colors"
          >
            <Download size={16} />
            Télécharger PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-luxury-200 text-luxury-600 hover:bg-luxury-50 font-semibold py-3 rounded-luxury transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
