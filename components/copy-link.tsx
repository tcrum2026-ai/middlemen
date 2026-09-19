"use client";

import { useState } from "react";

/**
 * A URL you are meant to hand to someone else, with the copy action attached.
 * Inline rather than a code block: this sits in a table row, not a snippet box.
 */
export function CopyLink({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="max-w-[14rem] truncate font-mono text-xs text-jade-400 hover:underline"
        title={url}
      >
        {url.replace(/^https?:\/\//, "")}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            // Clipboard is blocked (insecure origin, or the browser said no).
            // The link is right there and selectable, so this is not fatal.
            setCopied(false);
          }
        }}
        className="shrink-0 text-xs font-medium text-mist-400 hover:text-mist-100"
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
