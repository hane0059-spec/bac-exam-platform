// src/app/api/student/sessions/[sessionId]/finish/route.ts
// POST: التسليم النهائي في وضع المراجعة (ما لم يُجَب يُحسَب صفراً).
import { NextResponse } from "next/server";
import { finalizeSession } from "@/lib/exam";
import { loadReviewSession } from "@/lib/examReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, props: { params: Promise<{ sessionId: string }> }) {
  const params = await props.params;
  const r = await loadReviewSession(params.sessionId);
  if ("error" in r) return r.error;
  await finalizeSession(r.exam.id, "COMPLETED");
  return NextResponse.json({ finished: true });
}
