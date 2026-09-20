"use client";

import { useState } from "react";

export function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="card overflow-hidden !p-0">
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2.5">
        <span className="text-xs text-mist-400">{label ?? "Snippet"}</span>
        <button onClick={copy} className="tap text-xs font-medium text-jade-400 hover:underline">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre tabIndex={0} role="group" aria-label={label ?? "Snippet"} className="overflow-x-auto px-4 py-3.5 font-mono text-xs leading-relaxed text-mist-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}
