import { MIN_REVIEWS_TO_DISPLAY } from "@/lib/ratings";

function Star({ fill }: { fill: number }) {
  const id = `star-clip-${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={20 * fill} height="20" />
        </clipPath>
      </defs>
      <path
        d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8L10 1.5z"
        className="fill-none stroke-current text-stone-300"
        strokeWidth="1"
      />
      <path
        d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8L10 1.5z"
        className="fill-current text-amber-500"
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}

export default function StarRating({
  rating,
  reviewCount,
  size = "sm",
}: {
  rating: number | null;
  reviewCount: number;
  size?: "sm" | "md";
}) {
  if (rating == null) {
    return (
      <span className="text-sm text-stone-500">
        New — {reviewCount}/{MIN_REVIEWS_TO_DISPLAY} reviews needed
      </span>
    );
  }

  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.max(0, Math.min(1, rating - i));
    return <Star key={i} fill={fill} />;
  });

  return (
    <span className={`inline-flex items-center gap-1.5 ${size === "md" ? "text-base" : "text-sm"}`}>
      <span className="flex items-center gap-0.5">{stars}</span>
      <span className="font-semibold text-stone-800">{rating.toFixed(1)}</span>
      <span className="text-stone-500">
        ({reviewCount} review{reviewCount === 1 ? "" : "s"})
      </span>
    </span>
  );
}
