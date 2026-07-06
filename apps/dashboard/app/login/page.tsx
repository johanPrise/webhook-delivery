import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-lg font-semibold">Webhook Delivery</h1>
        <p className="text-sm text-black/60">Collez la clé API de votre Application pour continuer.</p>
      </div>
      <LoginForm />
    </div>
  );
}
