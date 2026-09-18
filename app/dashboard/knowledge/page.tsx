import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, EmptyState, PageHeader, relativeTime } from "@/components/ui";
import Link from "next/link";
import { addKbAction, applyTemplateAction, deleteKbAction } from "../actions";
import { TEMPLATES } from "@/lib/templates";
import { activeBusiness } from "@/lib/session";
import { isPlaceholder, listKb } from "@/lib/repo";

export default async function KnowledgePage() {
  const business = await activeBusiness();
  const articles = listKb(business.id);
  const stubs = articles.filter(isPlaceholder);

  return (
    <div>
      <PageHeader
        title="Knowledge"
        subtitle={`Everything ${business.assistant_name} is allowed to say. If it isn't here, the assistant tells the customer it will check with a person instead of guessing.`}
      />

      {stubs.length > 0 ? (
        <div className="card mb-5 border-amber-glow/30 bg-amber-glow/[0.05] p-4">
          <p className="text-sm font-semibold">
            {stubs.length} article{stubs.length === 1 ? " is" : "s are"} still a placeholder
          </p>
          <p className="mt-1 text-sm text-mist-300">
            The assistant will not quote them — it says it doesn&apos;t know instead. Replace the TODO lines and they
            go live on the next message.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {articles.length === 0 ? (
            <EmptyState title="Nothing to work from yet" body="Add your prices, policies and FAQs and the assistant can start answering." />
          ) : (
            articles.map((article) => (
              <Card key={article.id} className="!p-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-ink-700 px-5 py-3">
                  <h2 className="min-w-0 flex-1 truncate font-semibold">{article.title}</h2>
                  {isPlaceholder(article) ? <Badge tone="amber">placeholder</Badge> : null}
                  <span className="text-xs text-mist-400">
                    {article.source} · {relativeTime(article.updated_at)}
                  </span>
                  <form action={deleteKbAction}>
                    <input type="hidden" name="article_id" value={article.id} />
                    <button className="text-xs text-mist-400 transition hover:text-rose-alert">Remove</button>
                  </form>
                </div>
                <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-mist-300">{article.body}</p>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
        <Card>
          <h2 className="font-semibold">Load a starter pack</h2>
          <p className="mt-1 text-xs text-mist-400">
            Adds the articles your trade needs, skipping any title you already have.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TEMPLATES.map((template) => (
              <form key={template.slug} action={applyTemplateAction}>
                <input type="hidden" name="template" value={template.slug} />
                <button className="rounded-full border border-ink-700 px-3 py-1.5 text-xs text-mist-300 transition hover:border-jade-500/50 hover:text-mist-100">
                  {template.name}
                </button>
              </form>
            ))}
          </div>
          <Link href="/templates" className="mt-3 inline-block text-xs text-jade-400 hover:underline">
            Preview what&apos;s in each pack →
          </Link>
        </Card>

        <Card className="h-fit">
          <h2 className="font-semibold">Add an article</h2>
          <p className="mt-1 text-xs text-mist-400">Takes effect on the very next message.</p>
          <form action={addKbAction} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" required className="field" placeholder="Cancellation policy" />
            </div>
            <div>
              <label className="label" htmlFor="body">Content</label>
              <textarea id="body" name="body" required rows={8} className="field resize-y" placeholder="Reschedule free up to 4 hours before…" />
            </div>
            <SubmitButton className="btn btn-primary w-full justify-center" pendingLabel="Adding…">Add to knowledge base</SubmitButton>
          </form>
        </Card>
        </div>
      </div>
    </div>
  );
}
