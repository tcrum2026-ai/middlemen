/**
 * A real screenshot of the running app, framed like a browser window.
 *
 * Deliberately a plain <img>, not next/image: these are static files under
 * public/, and next/image's optimization endpoint needs `sharp` in a
 * self-hosted production build — a dependency this doesn't otherwise need,
 * for a resize these fixed, pre-sized PNGs don't require.
 */
export function Screenshot({
  src,
  alt,
  title,
  aspect = "16 / 10",
}: {
  src: string;
  alt: string;
  title?: string;
  aspect?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
      {title ? (
        <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900/60 px-4 py-2.5">
          <span className="flex gap-1.5">
            {["#3a4150", "#3a4150", "#3a4150"].map((c, i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            ))}
          </span>
          <span className="ml-2 text-xs text-mist-400">{title}</span>
        </div>
      ) : null}
      <div className="overflow-hidden" style={{ aspectRatio: aspect }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    </div>
  );
}
