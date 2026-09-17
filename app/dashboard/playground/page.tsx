import { PageHeader } from "@/components/ui";
import { PlaygroundClient } from "./playground-client";
import { activeBusiness } from "@/lib/session";

export default async function PlaygroundPage() {
  const business = await activeBusiness();
  const service = business.services[0]?.toLowerCase();

  return (
    <div>
      <PageHeader
        title="Playground"
        subtitle={`Test ${business.assistant_name} against the questions you actually get. Tools run in dry-run mode — nothing is booked, filed or queued.`}
      />
      <PlaygroundClient
        assistantName={business.assistant_name}
        suggestions={[
          service ? `How much is ${service}?` : "How much do you charge?",
          "Are you open on Saturday?",
          "Can someone come out tomorrow?",
          "I want a refund",
          "I need to speak to a person",
        ]}
      />
    </div>
  );
}
