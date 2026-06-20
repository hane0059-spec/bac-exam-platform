"use client";
// src/components/CreatorNotesField.tsx
// ملاحظات خاصّة يكتبها مُنشئ العنصر (مؤسّسة/مستخدم) ويطّلع عليها هو وحده.
export default function CreatorNotesField({
  value,
  onChange,
  about = "هذا الحساب",
}: {
  value: string;
  onChange: (v: string) => void;
  about?: string;
}) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
      <label className="mb-1 block text-sm font-medium text-gold">
        ملاحظات خاصّة (تظهر لك وحدك)
      </label>
      <textarea
        className="field min-h-[70px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`ملاحظات تكتبها لنفسك عن ${about}…`}
      />
      <p className="mt-1 text-xs text-ink/50">
        خاصّة بك كمُنشئ؛ لا يراها غيرك، وتستطيع تعديلها لاحقاً.
      </p>
    </div>
  );
}
