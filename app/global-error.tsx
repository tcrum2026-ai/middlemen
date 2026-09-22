"use client";

/**
 * Last-resort boundary: only fires if the root layout itself throws (a font
 * or provider crash, not a page-level error — those are app/error.tsx and
 * app/dashboard/error.tsx). It has to render its own <html>/<body> because
 * it replaces the root layout entirely, so it can't share their styling —
 * this stays plain and dependency-free on purpose.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#0a0d10",
          color: "#e4e7eb",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something broke on our end.</h1>
        <p style={{ color: "#8b93a1", maxWidth: "28rem" }}>
          Not something you did. Try reloading — if it keeps happening, the details are in the server log.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.625rem",
            background: "#16a874",
            color: "#0a0d10",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
