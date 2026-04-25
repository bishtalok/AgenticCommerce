import { Info } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Safety disclaimer"
      className="border-b bg-boots-sky/60 px-4 py-2 text-center text-xs text-boots-navy"
    >
      <span className="inline-flex items-center gap-2">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Not medical advice. Speak to a pharmacist.
      </span>
    </div>
  );
}
