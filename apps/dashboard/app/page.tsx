import { redirect } from "next/navigation";
import { getApiKeyOrNull } from "@/lib/session";

export default async function Home() {
  const apiKey = await getApiKeyOrNull();
  redirect(apiKey ? "/events" : "/login");
}