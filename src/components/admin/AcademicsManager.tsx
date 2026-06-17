"use client";
// src/components/admin/AcademicsManager.tsx
// المدير: نماذج إنشاء صفّ ومادة.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Grade {
  id: string;
  name: string;
}

export default function AcademicsManager({ grades }: { grades: Grade[] }) {
  const router = useRouter();

  // صفّ
  const [gName, setGName] = useState("");
  const [gCode, setGCode] = useState("");
  const [gOrder, setGOrder] = useState(0);
  const [gBusy, setGBusy] = useState(false);
  const [gErr, setGErr] = useState("");

  // مادة
  const [sName, setSName] = useState("");
  const [sCode, setSCode] = useState("");
  const [sGrade, setSGrade] = useState(grades[0]?.id ?? "");
  const [sColor, setSColor] = useState("#1F7A63");
  const [sBusy, setSBusy] = useState(false);
  const [sErr, setSErr] = useState("");

  async function addGrade() {
    setGErr("");
    setGBusy(true);
    const res = await fetch("/api/admin/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: gName, code: gCode, orderNum: Number(gOrder) }),
    });
    const data = await res.json().catch(() => ({}));
    setGBusy(false);
    if (!res.ok) {
      setGErr(data.error ?? "تعذّر الإضافة.");
      return;
    }
    setGName("");
    setGCode("");
    setGOrder(0);
    router.refresh();
  }

  async function addSubject() {
    setSErr("");
    setSBusy(true);
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sName,
        code: sCode,
        gradeLevelId: sGrade,
        color: sColor,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSBusy(false);
    if (!res.ok) {
      setSErr(data.error ?? "تعذّر الإضافة.");
      return;
    }
    setSName("");
    setSCode("");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">إضافة صفّ</h3>
        <input
          className="field"
          placeholder="اسم الصفّ (مثل: بكالوريا علمي)"
          value={gName}
          onChange={(e) => setGName(e.target.value)}
        />
        <input
          className="field"
          dir="ltr"
          placeholder="الرمز (مثل: BAC_SCI)"
          value={gCode}
          onChange={(e) => setGCode(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm text-ink/60">الترتيب</label>
          <input
            type="number"
            className="field"
            value={gOrder}
            onChange={(e) => setGOrder(Number(e.target.value))}
          />
        </div>
        {gErr && <p className="text-sm text-red-600">{gErr}</p>}
        <button
          onClick={addGrade}
          disabled={gBusy || !gName.trim() || !gCode.trim()}
          className="btn-primary"
        >
          إضافة الصفّ
        </button>
      </div>

      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">إضافة مادة</h3>
        <input
          className="field"
          placeholder="اسم المادة (مثل: الفيزياء)"
          value={sName}
          onChange={(e) => setSName(e.target.value)}
        />
        <input
          className="field"
          dir="ltr"
          placeholder="الرمز (مثل: PHYS)"
          value={sCode}
          onChange={(e) => setSCode(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm text-ink/60">الصفّ</label>
          <select
            className="field"
            value={sGrade}
            onChange={(e) => setSGrade(e.target.value)}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink/60">اللون</label>
          <input
            type="color"
            value={sColor}
            onChange={(e) => setSColor(e.target.value)}
            className="h-9 w-12 rounded border border-line"
          />
        </div>
        {sErr && <p className="text-sm text-red-600">{sErr}</p>}
        <button
          onClick={addSubject}
          disabled={sBusy || !sName.trim() || !sCode.trim() || !sGrade}
          className="btn-primary"
        >
          إضافة المادة
        </button>
      </div>
    </div>
  );
}
