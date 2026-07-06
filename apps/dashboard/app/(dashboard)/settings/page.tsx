import { getApplication } from "@/lib/api";
import { RegenerateKeyButton } from "./regenerate-key-button";

export default async function SettingsPage() {
  const application = await getApplication();

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-lg font-semibold">Réglages</h1>

      <section className="flex flex-col gap-1 text-sm">
        <span className="text-black/50">Application</span>
        <span>{application.name}</span>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm text-black/50">Clé API</span>
        <p className="text-sm text-black/60">
          Régénérer révoque immédiatement l&apos;ancienne clé — toute intégration qui l&apos;utilise cessera de
          fonctionner.
        </p>
        <RegenerateKeyButton />
      </section>
    </div>
  );
}
