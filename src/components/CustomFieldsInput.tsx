"use client";
// src/components/CustomFieldsInput.tsx
// عرض حقول مخصّصة ديناميكية وجمع قيمها.
import type { FieldDef } from "@/lib/customFields";

export default function CustomFieldsInput({
  defs,
  value,
  onChange,
}: {
  defs: FieldDef[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  if (defs.length === 0) return null;
  const set = (key: string, v: string) => onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {defs.map((d) => (
        <div key={d.id}>
          <label className="mb-1 block text-sm font-medium">
            {d.label}
            {d.required && <span className="text-red-500"> *</span>}
          </label>
          {d.fieldType === "SELECT" ? (
            <select
              className="field"
              value={value[d.fieldKey] ?? ""}
              onChange={(e) => set(d.fieldKey, e.target.value)}
            >
              <option value="">—</option>
              {d.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={d.fieldType === "NUMBER" ? "number" : "text"}
              className="field"
              value={value[d.fieldKey] ?? ""}
              onChange={(e) => set(d.fieldKey, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
