export function WhyChip({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-boots-sky px-2.5 py-0.5 text-xs font-medium text-boots-navy">
      {reason}
    </span>
  );
}

export function SubstitutedChip({ originalSku }: { originalSku: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
      title={`Substituted because ${originalSku} was unavailable`}
    >
      Substituted
    </span>
  );
}
