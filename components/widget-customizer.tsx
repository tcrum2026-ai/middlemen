"use client";

import { useMemo, useState } from "react";
import { SendIcon } from "@/components/icons";

const ACCENTS = ["#19c37d", "#3b82f6", "#f5b544", "#f4667d", "#7c8cff", "#e2e8f0"];

/**
 * Same rule the shipped widget applies at runtime, so the preview can't show a
 * combination the real widget wouldn't produce.
 */
function readableOn(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return "#07080a";
  const value = parseInt(match[1], 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel((value >> 16) & 255) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255);
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#07080a" : "#ffffff";
}

export function WidgetCustomizer({
  origin,
  widgetKey,
  businessName,
  defaultGreeting,
}: {
  origin: string;
  widgetKey: string;
  businessName: string;
  defaultGreeting: string;
}) {
  const [accent, setAccent] = useState("#19c37d");
  const [title, setTitle] = useState(`Chat with ${businessName}`);
  const [greeting, setGreeting] = useState(defaultGreeting);
  const [position, setPosition] = useState<"right" | "left">("right");
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(() => {
    const attrs = [
      `src="${origin}/widget.js"`,
      `data-key="${widgetKey}"`,
      `data-title="${title.replace(/"/g, "&quot;")}"`,
    ];
    if (accent !== "#19c37d") attrs.push(`data-accent="${accent}"`);
    if (position !== "right") attrs.push(`data-position="${position}"`);
    if (greeting !== defaultGreeting) attrs.push(`data-greeting="${greeting.replace(/"/g, "&quot;")}"`);
    return `<script ${attrs.join("\n        ")}\n        defer></script>`;
  }, [origin, widgetKey, title, accent, position, greeting, defaultGreeting]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const onAccent = readableOn(accent);

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="card min-w-0 space-y-4 p-5">
        <div>
          <label className="label" htmlFor="widget-title">Launcher text</label>
          <input
            id="widget-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="field"
            maxLength={40}
          />
        </div>

        <div>
          <label className="label" htmlFor="widget-greeting">Opening message</label>
          <textarea
            id="widget-greeting"
            value={greeting}
            onChange={(event) => setGreeting(event.target.value)}
            rows={2}
            className="field resize-y"
            maxLength={240}
          />
        </div>

        <div>
          <p className="label">Accent</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((colour) => (
              <button
                key={colour}
                onClick={() => setAccent(colour)}
                aria-label={`Accent ${colour}`}
                className={`h-8 w-8 rounded-lg border-2 transition ${
                  accent === colour ? "border-mist-100" : "border-transparent"
                }`}
                style={{ background: colour }}
              />
            ))}
            <input
              type="color"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              aria-label="Custom accent"
              className="h-8 w-12 cursor-pointer rounded-lg border border-ink-700 bg-ink-950"
            />
          </div>
        </div>

        <div>
          <p className="label">Corner</p>
          <div className="flex gap-2">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setPosition(side)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition ${
                  position === side
                    ? "border-jade-500/50 bg-jade-500/10 text-jade-300"
                    : "border-ink-700 text-mist-400 hover:text-mist-100"
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-ink-700 bg-ink-950">
          <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
            <span className="text-xs text-mist-400">Your snippet</span>
            <button onClick={copy} className="tap text-xs font-medium text-jade-400 hover:underline">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre tabIndex={0} role="group" aria-label="Embed snippet" className="overflow-x-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-mist-300">
            <code>{snippet}</code>
          </pre>
        </div>
      </div>

      {/* Preview of a customer's page, not of this dashboard. */}
      <div className="card min-w-0 overflow-hidden !p-0">
        <div className="border-b border-ink-700 px-4 py-2 text-xs text-mist-400">Preview</div>
        <div className="relative h-[27rem] overflow-hidden bg-[#fbfbfa] p-5">
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-[#e6e6e1]" />
            <div className="h-6 w-52 rounded bg-[#dcdcd6]" />
            <div className="h-3 w-full rounded bg-[#ececE7]" />
            <div className="h-3 w-4/5 rounded bg-[#ececE7]" />
          </div>

          <div
            className={`absolute bottom-16 w-[min(17rem,calc(100%-2.5rem))] overflow-hidden rounded-2xl border border-[#212733] bg-[#0b0d11] shadow-2xl ${
              position === "right" ? "right-5" : "left-5"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-[#212733] px-3.5 py-2.5">
              <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
              <span className="truncate text-[13px] font-semibold text-[#e7eaf1]">{title || "Chat with us"}</span>
              <span className="ml-auto text-[#8d96ab]">×</span>
            </div>
            <div className="space-y-2 p-3.5">
              <p className="max-w-[90%] rounded-[14px] border border-[#212733] bg-[#161a23] px-3 py-2 text-[12px] leading-relaxed text-[#e7eaf1]">
                {greeting || "Hi! How can I help?"}
              </p>
              <p
                className="ml-auto max-w-[75%] rounded-[14px] px-3 py-2 text-[12px] leading-relaxed"
                style={{ background: accent, color: onAccent }}
              >
                How much for a callout?
              </p>
            </div>
            <div className="flex items-center gap-2 border-t border-[#212733] p-2.5">
              <span className="flex-1 rounded-lg border border-[#212733] bg-[#07080a] px-2.5 py-1.5 text-[11px] text-[#8d96ab]">
                Type your message…
              </span>
              <span
                className="grid h-7 w-8 place-items-center rounded-lg"
                style={{ background: accent, color: onAccent }}
              >
                <SendIcon width={13} height={13} />
              </span>
            </div>
            <p className="pb-2 text-center text-[10px] text-[#8d96ab]">
              Answers are AI. Ask for a person any time.
            </p>
          </div>

          <div
            className={`absolute bottom-5 flex max-w-[calc(100%-2.5rem)] items-center gap-2 truncate rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-lg ${
              position === "right" ? "right-5" : "left-5"
            }`}
            style={{ background: accent, color: onAccent }}
          >
            {title || "Chat with us"}
          </div>
        </div>
      </div>
    </div>
  );
}
