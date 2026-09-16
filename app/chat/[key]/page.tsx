import { notFound } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { Logo } from "@/components/ui";
import { ensureSeeded } from "@/lib/seed";
import { getBusinessByWidgetKey } from "@/lib/repo";

export default async function HostedChatPage({ params }: { params: Promise<{ key: string }> }) {
  ensureSeeded();
  const { key } = await params;
  const business = getBusinessByWidgetKey(key);
  if (!business) notFound();

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-semibold">{business.name}</h1>
          <p className="mt-1 text-sm text-mist-400">
            {business.assistant_name} answers day and night. Need a person? Just ask — a teammate will call you.
          </p>
        </div>

        <ChatPanel
          widgetKey={business.widget_key}
          greeting={business.greeting}
          assistantName={business.assistant_name}
          businessName={business.name}
          suggestions={business.services.slice(0, 2).map((service) => `I need help with ${service.toLowerCase()}`)}
          heightClass="h-[30rem]"
        />

        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-mist-400">
          Powered by <Logo className="text-sm text-mist-300" />
        </p>
      </div>
    </div>
  );
}
