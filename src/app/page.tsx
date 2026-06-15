// src/app/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { dashboardPath } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? dashboardPath(session.role) : "/login");
}
