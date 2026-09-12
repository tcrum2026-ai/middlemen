import { sendMessageAction } from "@/lib/actions/messages";
import SubmitButton from "@/components/SubmitButton";

type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { name: string };
};

export default function MessageThread({
  dealId,
  messages,
  currentUserId,
}: {
  dealId: string;
  messages: ThreadMessage[];
  currentUserId: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-900">Messages</h2>
      <div className="mt-3 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-stone-500">
            No messages yet — say hello to coordinate details.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm sm:max-w-sm ${
                    isMine ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  {!isMine && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.sender.name}</p>}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={sendMessageAction} className="mt-3 flex gap-2">
        <input type="hidden" name="dealId" value={dealId} />
        <input
          type="text"
          name="body"
          required
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        <SubmitButton
          pendingText="Sending..."
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
        >
          Send
        </SubmitButton>
      </form>
    </div>
  );
}
