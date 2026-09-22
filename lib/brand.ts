/**
 * The mark itself: a doorway with a speech-bubble tail — the room customers
 * arrive at, and the fact that something in it talks back. One path, solid
 * fill, legible at 16px as well as 630px.
 *
 * Kept here, not redrawn in each place that renders it, because two of
 * those places — app/icon.tsx and app/opengraph-image.tsx — run through
 * next/og's Satori renderer, which can't import the actual <Logo>
 * component. A plain path string is the only thing all three can share
 * without one of them quietly drifting from the others.
 */
export const LOGOMARK_PATH = "M6,20 L6,10 A6,6 0 0,1 18,10 L18,20 L11,20 L8,23.5 L9,20 L6,20 Z";

export const BRAND_GREEN = "#19c37d";
