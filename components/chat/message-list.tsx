"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/stores/missionStore";
import { DestinationCard } from "@/components/chat/destination-card";
import { InferenceCard } from "@/components/chat/inference-card";
import { cn } from "@/lib/utils";

export function MessageList({
  messages,
  busy,
}: {
  messages: ChatMessage[];
  busy?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

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
          return (
            <div key={m.id} className="flex items-end gap-2">
              <AgentAvatar />
              <div className="flex-1">
                <DestinationCard context={m.context} />
              </div>
            </div>
          );
        }
        if (m.kind === "inference") {
          return (
            <div key={m.id} className="flex items-end gap-2">
              <AgentAvatar />
              <div className="flex-1">
                <InferenceCard inference={m.inference} />
              </div>
            </div>
          );
        }
        if (m.kind === "persona") {
          return (
            <div key={m.id} className="flex items-end gap-2">
              <AgentAvatar />
              <div className="flex-1">
                <PersonaBubble
                  avatar={m.avatar}
                  label={m.label}
                  description={m.description}
                  profileNote={m.profileNote}
                />
              </div>
            </div>
          );
        }
        return (
          <Bubble key={m.id} actor={m.actor}>
            {m.text}
          </Bubble>
        );
      })}

      {/* Typing indicator */}
      {busy && <TypingIndicator />}

      <div ref={endRef} />
    </div>
  );
}

function AgentAvatar() {
  return (
    <div
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-boots-navy text-[11px] font-extrabold tracking-tight text-white"
      aria-hidden
    >
      B
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-label="Agent is typing">
      <AgentAvatar />
      <div className="flex items-center gap-1 rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border bg-white px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-boots-blue"
            style={{ animation: `dot-pulse 1.2s ease-in-out ${i * 0.18}s infinite` }}
          />
        ))}
      </div>
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

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2 text-xs italic text-muted-foreground">
          {children}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[80%] px-4 py-2.5 text-sm leading-relaxed",
            "rounded-tl-2xl rounded-tr-2xl rounded-br-sm rounded-bl-2xl",
            "bg-boots-navy text-white",
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  // AGENT
  return (
    <div className="flex items-end gap-2">
      <AgentAvatar />
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 text-sm leading-relaxed",
          "rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
          "border bg-white shadow-sm",
          tone === "refusal" && "border-destructive bg-destructive/10 text-destructive",
          !tone && "text-boots-navy",
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
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl" aria-hidden>{avatar}</span>
        <div>
          <p className="text-xs font-semibold text-amber-900">{label}</p>
          <p className="text-[10px] text-amber-700">{description}</p>
        </div>
      </div>
      <p className="mt-1 border-t border-amber-200 pt-1 text-[10px] text-amber-600">
        ⚠️ {profileNote}
      </p>
    </div>
  );
}
