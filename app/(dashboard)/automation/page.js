import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AutomationClient from "./AutomationClient";

export const dynamic = "force-dynamic";

// Server-side role gate: students must never reach institute settings, even by
// typing the URL directly. Teachers get a trimmed low-risk view; admins get all.
// (The destructive APIs are independently ADMIN-gated server-side.)
export default async function AutomationPage() {
  const user = await getAuthUser();

  if (user.role === "STUDENT") {
    redirect("/dashboard");
  }

  return <AutomationClient role={user.role} />;
}
