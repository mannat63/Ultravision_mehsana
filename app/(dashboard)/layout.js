import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/auth";
import { feesVisibleToStudents } from "@/lib/feeVisibility";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";
import AnalyticsHeartbeat from "@/components/AnalyticsHeartbeat";
import AccessDenied from "@/components/AccessDenied";

export default async function DashboardGroupLayout({ children }) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  // A signed-in Clerk user whose email isn't linked to any student/teacher/admin
  // record makes getAuthUser() throw. Catch it here so we render a friendly
  // "account not linked" screen with a Sign-out button instead of crashing to
  // global-error (which also leaves the user stuck and pings Intellogy "Down").
  let user;
  try {
    user = await getAuthUser();
  } catch (e) {
    return <AccessDenied message={e?.message} />;
  }

  const showFees = await feesVisibleToStudents(user.institute_id);

  return (
    <DashboardLayoutClient role={user.role} userName={user.name} showFees={showFees}>
      {/* Localhost fallback that auto-pushes analytics to Intellogy OS (admins only). */}
      {user.role === "ADMIN" && <AnalyticsHeartbeat />}
      {children}
    </DashboardLayoutClient>
  );
}
