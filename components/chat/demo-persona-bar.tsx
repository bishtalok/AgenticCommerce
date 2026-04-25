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
      className="mt-3"
    >
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Try a demo persona
      </p>
      <div className="flex flex-wrap gap-2">
        {personas.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.simulatedQuery, p)}
            title={p.profileNote}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-2 text-left transition hover:border-boots-blue hover:bg-boots-sky focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-boots-blue"
          >
            <span className="text-lg leading-none" aria-hidden>{p.avatar}</span>
            <div>
              <p className="text-xs font-bold leading-tight text-boots-navy">{p.label.split(" · ")[0]}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">{p.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export type { Persona };
