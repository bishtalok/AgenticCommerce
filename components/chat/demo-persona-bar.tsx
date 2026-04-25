"use client";

import personasRaw from "@/data/demo-personas.json";

interface Persona {
  id: string;
  label: string;
  description: string;
  simulatedQuery: string;
  profileNote: string;
  avatar: string;
}

const personas = personasRaw as Persona[];

interface DemoPersonaBarProps {
  onSelect: (query: string, persona: Persona) => void;
}

export function DemoPersonaBar({ onSelect }: DemoPersonaBarProps) {
  return (
    <div
      role="region"
      aria-label="Demo persona shortcuts"
      className="border-t bg-muted/30 px-4 py-2"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Demo shortcuts — autonomous proposals
      </p>
      <div className="flex flex-wrap gap-1.5">
        {personas.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.simulatedQuery, p)}
            className="flex items-center gap-1.5 rounded-full border border-boots-navy/20 bg-white px-3 py-1 text-xs font-medium text-boots-navy shadow-sm hover:bg-boots-sky/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-boots-blue transition-colors"
            title={`${p.description}\n${p.profileNote}`}
          >
            <span aria-hidden>{p.avatar}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type { Persona };
