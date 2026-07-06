import { listEndpoints } from "@/lib/api";
import { toggleEndpointAction } from "@/app/actions/endpoints";
import { CreateEndpointForm } from "./create-endpoint-form";

export default async function EndpointsPage() {
  const endpoints = await listEndpoints();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Endpoints</h1>

      <CreateEndpointForm />

      <div className="flex flex-col gap-3">
        {endpoints.map((endpoint) => (
          <div key={endpoint.id} className="flex flex-col gap-2 rounded border border-black/10 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono">{endpoint.url}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  endpoint.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {endpoint.isActive ? "actif" : "désactivé"}
              </span>
            </div>
            {endpoint.description && <p className="text-black/60">{endpoint.description}</p>}
            <p className="font-mono text-xs text-black/40">secret : {endpoint.secret}</p>
            <form action={toggleEndpointAction}>
              <input type="hidden" name="id" value={endpoint.id} />
              <input type="hidden" name="isActive" value={(!endpoint.isActive).toString()} />
              <button type="submit" className="text-xs text-black/50 hover:text-black">
                {endpoint.isActive ? "Désactiver" : "Réactiver"}
              </button>
            </form>
          </div>
        ))}
        {endpoints.length === 0 && <p className="text-sm text-black/40">Aucun endpoint pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
