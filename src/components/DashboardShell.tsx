// src/components/DashboardShell.tsx
import type { SessionData } from "@/lib/auth";
import { roleLabel, welcome } from "@/lib/gender";
import LogoutButton from "./LogoutButton";
import TextSizeControl from "./TextSizeControl";

export default function DashboardShell({
  session,
  children,
}: {
  session: SessionData;
  children: React.ReactNode;
}) {
  const fullName = `${session.firstName} ${session.lastName}`;
  const label = roleLabel(session.role, session.gender);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
              ع
            </div>
            <div>
              <p className="text-sm text-ink/60">{label}</p>
              <p className="font-display text-lg font-bold leading-tight">
                {fullName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TextSizeControl />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold">
            {welcome(session.gender)}، {session.firstName}
          </h1>
          <p className="mt-1 text-ink/60">
            هذه لوحة الـ{label}. الميزات تُضاف تِباعاً في الخطوات القادمة.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}

export function PlaceholderCard({
  title,
  description,
  soon = true,
}: {
  title: string;
  description: string;
  soon?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {soon && (
          <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
            قريباً
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-ink/60">{description}</p>
    </div>
  );
}
