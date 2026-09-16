import { TRUST } from "@/lib/marketing";
import { ShieldIcon } from "@/components/icons";

export function Trust() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TRUST.map((item) => (
        <div key={item.title} className="card p-5">
          <ShieldIcon width={18} height={18} className="text-jade-400" />
          <h3 className="mt-3.5 font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
