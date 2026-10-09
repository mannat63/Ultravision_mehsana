import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth";
import LoginClient from "@/components/LoginClient";
import ContactSupport from "@/components/ContactSupport";

export default async function Page() {
  if (await hasSession()) redirect("/dashboard");

  return (
    <>
      <LoginClient />
      <ContactSupport />
    </>
  );
}
