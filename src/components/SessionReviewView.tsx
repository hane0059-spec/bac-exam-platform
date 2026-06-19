// src/components/SessionReviewView.tsx
// عرض مراجعة جلسة (خادمي): الدرجة + استعراض الأسئلة والإجابات.
import type { SessionReview } from "@/lib/exam";

export default function SessionReviewView({
  review,
}: {
  review: SessionReview;
}) {
  const pct = review.percentage;
  const tone = pct >= 50 ? "text-primary-dark" : "text-red-600";
  return (
    <div className="space-y-5">
      <div className="card p-6 text-center">
        <p className="text-ink/60">«{review.quizTitle}»</p>
        <p className={`my-2 font-display text-5xl font-bold ${tone}`}>{pct}%</p>
        <p className="text-sm text-ink/60">
          {review.totalScore} من {review.maxPossibleScore} نقطة
          {review.status === "TIMED_OUT" && " · انتهى الوقت"}
          {review.status === "IN_PROGRESS" && " · قيد الأداء"}
        </p>
      </div>

      <div className="space-y-3">
        {review.items.map((it) => (
          <div
            key={it.index}
            className={`card border-r-4 p-4 ${
              it.isCancelled
                ? "border-r-ink/20 opacity-70"
                : it.needsReview
                ? "border-r-gold"
                : it.isCorrect
                ? "border-r-primary"
                : "border-r-red-500"
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-medium leading-relaxed">
                {it.index}. {it.content}
              </p>
              {it.isCancelled ? (
                <span className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium text-ink/50">
                  مُلغى — لا يُحتسب
                </span>
              ) : it.needsReview ? (
                <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                  بانتظار المراجعة
                </span>
              ) : (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    it.isCorrect
                      ? "bg-primary text-white"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {it.scoreEarned} / {it.points}
                </span>
              )}
            </div>

            {it.options.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {it.options.map((o) => (
                  <li
                    key={o.id}
                    className={`rounded-lg px-2 py-1 ${
                      o.isCorrect
                        ? "bg-primary-light text-primary-dark"
                        : o.selected
                        ? "bg-red-50 text-red-700"
                        : "text-ink/70"
                    }`}
                  >
                    {o.label !== o.content && `${o.label}. `}
                    {o.content}
                    {o.isCorrect && " ✓"}
                    {o.selected && !o.isCorrect && " — إجابة الطالب"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm">
                <p>
                  إجابة الطالب:{" "}
                  <span
                    className={
                      it.isCorrect ? "text-primary-dark" : "text-red-600"
                    }
                  >
                    {it.textAnswer || "—"}
                  </span>
                </p>
                {!it.isCorrect && it.acceptedAnswers.length > 0 && (
                  <p className="text-ink/70">النموذجية: {it.acceptedAnswers[0]}</p>
                )}
              </div>
            )}

            {it.explanation && (
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                {it.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
