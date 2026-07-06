import { getEvent } from "@/lib/api";

export default async function EventDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const event = await getEvent(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{event.type}</h1>
        <p className="text-sm text-black/60">
          Endpoint : <span className="font-mono">{event.endpoint.url}</span>
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-black/70">Payload</h2>
        <pre className="overflow-x-auto rounded bg-black/5 p-3 text-xs">{JSON.stringify(event.payload, null, 2)}</pre>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-black/70">Timeline des tentatives</h2>
        <ol className="flex flex-col gap-2">
          {event.attempts.map((attempt) => (
            <li
              key={attempt.id}
              className="flex flex-wrap items-center gap-3 rounded border border-black/10 p-3 text-sm"
            >
              <span className="font-mono text-xs text-black/40">#{attempt.attemptNumber}</span>
              <span className={attempt.success ? "text-green-700" : "text-red-700"}>
                {attempt.success ? "OK" : "ÉCHEC"}
              </span>
              <span className="text-black/60">{attempt.statusCode ?? attempt.error ?? "sans réponse"}</span>
              <span className="text-black/40">{attempt.durationMs}ms</span>
              <span className="ml-auto text-black/40">{new Date(attempt.createdAt).toLocaleString("fr-FR")}</span>
            </li>
          ))}
          {event.attempts.length === 0 && (
            <p className="text-sm text-black/40">Aucune tentative pour l&apos;instant.</p>
          )}
        </ol>
      </section>
    </div>
  );
}
