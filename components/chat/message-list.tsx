"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/stores/missionStore";
import { DestinationCard } from "@/components/chat/destination-card";
import { InferenceCard } from "@/components/chat/inference-card";
import { cn } from "@/lib/utils";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversation with Boots travel agent"
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
    >
      {messages.map((m) => {
        if (m.kind === "question") {
          return (
            <Bubble key={m.id} actor="AGENT">
              {m.question.text}
            </Bubble>
          );
        }
        if (m.kind === "refusal") {
          return (
            <Bubble key={m.id} actor="AGENT" tone="refusal">
              {m.text}
            </Bubble>
          );
        }
        if (m.kind === "destination") {
          return <DestinationCard key={m.id} context={m.context} />;
        }
        if (m.kind === "inference") {
          // onCorrect is wired in the parent via prop — MessageList itself just renders.
          return <InferenceCard key={m.id} inference={m.inference} />;
        }
        if (m.kind === "persona") {
          return <PersonaBubble key={m.id} avatar={m.avatar} label={m.label} description={m.description} profileNote={m.profileNote} />;
        }
        return (
          <Bubble key={m.id} actor={m.actor}>
            {m.text}
          </Bubble>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function Bubble({
  actor,
  tone,
  children,
}: {
  actor: ChatMessage["actor"];
  tone?: "refusal";
  children: React.ReactNode;
}) {
  const isUser = actor === "USER";
  const isSystem = actor === "SYSTEM";
  return (
    <div
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
        isSystem && "justify-center"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
          isUser && "bg-boots-navy text-white",
          !isUser && !isSystem && "bg-boots-sky text-boots-navy",
          isSystem && "bg-muted text-muted-foreground italic text-xs",
          tone === "refusal" && "border border-destructive bg-destructive/10 text-destructive"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function PersonaBubble({
  avatar,
  label,
  description,
  profileNote,
}: {
  avatar: string;
  label: string;
  description: string;
  profileNote: string;
}) {
  return (
    <div className="mx-1 rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl" aria-hidden>{avatar}</span>
        <div>
          <p className="text-xs font-semibold text-amber-900">{label}</p>
          <p className="text-[10px] text-amber-700">{description}</p>
        </div>
      </div>
      <p className="text-[10px] text-amber-600 border-t border-amber-200 pt-1 mt-1">
        ⚠️ {profileNote}
      </p>
    </div>
  );
}
