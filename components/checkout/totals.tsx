export interface TotalsProps {
  subtotal: number;
  shipping: number;
  total: number;
}

export function Totals({ subtotal, shipping, total }: TotalsProps) {
  return (
    <dl className="flex flex-col gap-1 rounded-lg border bg-white p-4 text-sm">
      <Row label="Subtotal" value={subtotal} />
      <Row label={shipping === 0 ? "Shipping (free)" : "Shipping"} value={shipping} />
      <div className="my-1 border-t" />
      <Row label="Total" value={total} emphasise />
    </dl>
  );
}

function Row({ label, value, emphasise }: { label: string; value: number; emphasise?: boolean }) {
  return (
    <div className={emphasise ? "flex items-center justify-between font-semibold text-boots-navy" : "flex items-center justify-between text-muted-foreground"}>
      <dt>{label}</dt>
      <dd className="tabular-nums">€{value.toFixed(2)}</dd>
    </div>
  );
}
