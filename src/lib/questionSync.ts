// src/lib/questionSync.ts
// مزامنة تعديل سؤال بين التبويبات: صفحة تعديل السؤال (تبويب فرعي) تُعلِن عن الحفظ،
// وباني الاختبار (التبويب الأساسي) يحدّث نصّ السؤال ودرجته فوراً دون إعادة تحميل. للمتصفّح فقط.

const CHANNEL = "question-updated";

export interface QuestionUpdate {
  id: string;
  content: string;
  type: string;
  points: number;
  difficulty: string;
  tags: string[];
}

export function announceQuestionUpdate(u: QuestionUpdate): void {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(u);
    ch.close();
  } catch {
    // متصفّح بلا BroadcastChannel: يبقى التحديث بإعادة تحميل الصفحة.
  }
}

/** يستمع لتحديثات الأسئلة؛ يُعيد دالة الإلغاء. */
export function listenQuestionUpdates(cb: (u: QuestionUpdate) => void): () => void {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e: MessageEvent) => {
      const d = e.data as Partial<QuestionUpdate> | null;
      if (d && typeof d.id === "string" && typeof d.content === "string") cb(d as QuestionUpdate);
    };
    return () => ch.close();
  } catch {
    return () => {};
  }
}
