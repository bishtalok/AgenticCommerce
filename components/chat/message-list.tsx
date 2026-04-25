"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/stores/missionStore";
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
