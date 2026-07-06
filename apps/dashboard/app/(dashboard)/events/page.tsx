import Link from "next/link";
import { listEvents, type EventSummary } from "@/lib/api";

const STATUSES = ["PENDING", "RETRYING", "DELIVERED", "FAILED"] as const;
type Status = (typeof STATUSES)[number];

function isStatus(value: string | undefined): value is Status {
  return STATUSES.includes(value as Status);
}

const STATUS_STYLES: Record<Status, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  RETRYING: "bg-amber-100 text-amber-800",
  DELIVERED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: Readonly<{ status: EventSummary["status"] }>) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>;
}

export default async function EventsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const page = params.page && typeof params.page === "string" ? Number(params.page) : 1;

  const { items, total, pageSize } = await listEvents({ status, page, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Événements</h1>
        <form method="get" className="flex gap-2 text-sm">
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded border border-black/15 px-2 py-1"
          >
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded border border-black/15 px-3 py-1">
            Filtrer
          </button>
        </form>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-black/50">
            <th className="py-2 font-medium">Type</th>
            <th className="py-2 font-medium">Statut</th>
            <th className="py-2 font-medium">Tentatives</th>
            <th className="py-2 font-medium">Créé</th>
          </tr>
        </thead>
        <tbody>
          {items.map((event) => (
            <tr key={event.id} className="border-b border-black/5 hover:bg-black/[0.02]">
              <td className="py-2">
                <Link href={`/events/${event.id}`} className="font-mono text-xs hover:underline">
                  {event.type}
                </Link>
              </td>
              <td className="py-2">
                <StatusBadge status={event.status} />
              </td>
              <td className="py-2">{event.attemptCount}</td>
              <td className="py-2 text-black/60">{new Date(event.createdAt).toLocaleString("fr-FR")}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-black/40">
                Aucun événement.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={status ? `/events?page=${p}&status=${status}` : `/events?page=${p}`}
              className={`rounded px-2 py-1 ${p === page ? "bg-black text-white" : "border border-black/15"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
