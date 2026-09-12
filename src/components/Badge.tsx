const COLORS: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-stone-100 text-stone-600",
  CANCELLED: "bg-stone-100 text-stone-600",
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-stone-100 text-stone-600",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

export default function Badge({ status }: { status: string }) {
  const classes = COLORS[status] ?? "bg-stone-100 text-stone-600";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {status.replace("_", " ")}
    </span>
  );
}
