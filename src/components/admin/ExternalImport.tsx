"use client";
// src/components/admin/ExternalImport.tsx
// المدير: استيراد طلاب خارجيين من CSV/xlsx وإسناد اختبار منشور لهم.
import { useState } from "react";

const HEADERS = [
  "الاسم الأول",
  "الاسم الأخير",
  "اسم الأب",
  "اسم الأم",
  "الجنس",
  "الصفّ",
  "البريد",
  "هاتف الطالب",
  "هاتف ولي الأمر",
  "العنوان",
  "كلمة السرّ",
];

interface Quiz {
  id: string;
  title: string;
  teacherName: string;
  subjectName: string;
}
interface Grade {
  id: string;
  name: string;
}
interface Created {
  name: string;
  studentCode: string;
  password: string;
  email: string;
}
interface Result {
  quizTitle: string;
  created: Created[];
  reused: { name: string; identifier: string }[];
  errors: { row: number; reason: string }[];
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExternalImport({
  quizzes,
  grades,
}: {
  quizzes: Quiz[];
  grades: Grade[];
}) {
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    setError("");
    setResult(null);
    if (!file) {
      setError("اختر ملفاً.");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("quizId", quizId);
    fd.append("defaultGradeId", gradeId);
    const res = await fetch("/api/admin/external-import", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الاستيراد.");
      return;
    }
    setResult(data as Result);
  }

  async function exportCredentials(rows: Created[]) {
    const res = await fetch("/api/admin/external-import/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) {
      setError("تعذّر تصدير بيانات الدخول.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_credentials.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {quizzes.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد اختبارات منشورة لإسنادها بعد.
        </div>
      ) : (
        <div className="card space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                الاختبار المنشور
              </label>
              <select
                className="field"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} — {q.teacherName} ({q.subjectName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                الصفّ الافتراضي (عند غياب عمود الصفّ)
              </label>
              <select
                className="field"
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              ملف الطلاب (CSV أو xlsx)
            </label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>

          <div className="rounded-xl bg-ink/5 p-3 text-xs leading-relaxed text-ink/70">
            <p className="mb-1 font-medium">ترتيب الأعمدة (صفّ عناوين أول):</p>
            <p dir="rtl">{HEADERS.join(" | ")}</p>
            <p className="mt-1">
              الإجباري: الاسم الأول، الأخير، اسم الأب، الجنس (ذكر/أنثى). الباقي
              اختياري. كلمة السرّ تُولَّد تلقائياً إن تُركت فارغة.
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              <a
                href="/student_import_template.xlsx"
                className="text-primary hover:underline"
              >
                تنزيل قالب Excel (مُوصى)
              </a>
              <button
                type="button"
                onClick={() => downloadCsv("template_students.csv", [HEADERS])}
                className="text-primary hover:underline"
              >
                تنزيل قالب CSV
              </button>
            </div>
            <p className="mt-1 text-ink/50">
              ننصح بقالب Excel لتفادي مشاكل ترميز CSV العربية.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "جارٍ الاستيراد…" : "استيراد وإسناد"}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-semibold">
              نتيجة الاستيراد — {result.quizTitle}
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              أُنشئ {result.created.length} · أُعيد استخدام {result.reused.length}{" "}
              · أخطاء {result.errors.length}
            </p>
          </div>

          {result.created.length > 0 && (
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium">حسابات أُنشئت (بيانات الدخول)</h4>
                <button
                  onClick={() => exportCredentials(result.created)}
                  className="text-sm text-primary hover:underline"
                >
                  تنزيل بيانات الدخول (Excel)
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-ink/50">
                    <tr>
                      <th className="p-2 text-right">الاسم</th>
                      <th className="p-2 text-right">رمز الطالب</th>
                      <th className="p-2 text-right">كلمة السرّ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map((c, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="p-2">{c.name}</td>
                        <td className="p-2" dir="ltr">{c.studentCode}</td>
                        <td className="p-2" dir="ltr">{c.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="card p-5">
              <h4 className="mb-2 font-medium text-red-600">
                صفوف بها أخطاء
              </h4>
              <ul className="space-y-1 text-sm text-ink/70">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    صفّ {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
