import { redirect } from "next/navigation";
import dbConnect from "@/lib/db/mongodb";
import { getAuthUser, hasSession } from "@/lib/auth";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";

export default async function DashboardLayout({ children }) {
  if (!(await hasSession())) redirect("/");

  await dbConnect();
  const user = await getAuthUser();

  return (
    <DashboardLayoutClient role={user.role} userName={user.name}>
      {children}
    </DashboardLayoutClient>
  );
}
