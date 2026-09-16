"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon, SparkIcon } from "./icons";
import type { AssistantAction } from "@/lib/types";

interface Bubble {
  role: "customer" | "assistant";
  body: string;
  actions?: AssistantAction[];
}

export function ChatPanel({
  widgetKey,
  greeting,
  assistantName,
  businessName,
  suggestions = [],
  heightClass = "h-[26rem]",
}: {
  widgetKey: string;
  greeting: string;
  assistantName: string;
  businessName: string;
  suggestions?: string[];
  heightClass?: string;
}) {
  const [messages, setMessages] = useState<Bubble[]>([{ role: "assistant", body: greeting }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    setDraft("");
    setMessages((prev) => [...prev, { role: "customer", body }]);
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetKey, conversationId, message: body }),
      });
      if (!response.ok) throw new Error(`Chat failed: ${response.status}`);
      const data = (await response.json()) as {
        conversationId: string;
        reply: string;
        actions: AssistantAction[];
      };
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", body: data.reply, actions: data.actions }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          body: "I couldn't reach the assistant just now. A teammate will pick this up and follow up with you.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-ink-700 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-jade-500/15 text-jade-400">
          <SparkIcon width={16} height={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{assistantName}</p>
          <p className="truncate text-xs text-mist-400">{businessName}</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-mist-400">
          <span className="h-1.5 w-1.5 rounded-full bg-jade-500" />
          online
        </span>
      </div>

      <div ref={scroller} className={`flex-1 space-y-3 overflow-y-auto px-4 py-4 ${heightClass}`}>
        {messages.map((message, index) => (
          <div key={index} className={message.role === "customer" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === "customer"
                    ? "bg-jade-500 text-ink-950"
                    : "border border-ink-700 bg-ink-850 text-mist-100"
                }`}
              >
                {message.body}
              </div>
              {message.actions?.length ? (
                <ul className="space-y-1">
                  {message.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-mist-400">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-iris" />
                      <span>
                        <span className="text-mist-300">{action.label}</span>
                        {action.detail ? ` — ${action.detail}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}

        {busy ? (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl border border-ink-700 bg-ink-850 px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist-400"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {suggestions.length > 0 && messages.length === 1 ? (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => send(suggestion)}
              className="rounded-full border border-ink-700 px-3 py-1.5 text-xs text-mist-300 transition hover:border-jade-500/50 hover:text-mist-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 border-t border-ink-700 p-3"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about pricing, book a visit, ask for a callback…"
          className="field"
          aria-label="Message"
        />
        <button type="submit" disabled={busy || !draft.trim()} className="btn btn-primary disabled:opacity-40">
          <SendIcon width={16} height={16} />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </div>
  );
}
