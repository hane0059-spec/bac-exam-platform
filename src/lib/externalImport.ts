// src/lib/externalImport.ts
// أدوات استيراد الطلاب من ملف CSV أو xlsx عبر exceljs.
import ExcelJS from "exceljs";
import { Readable } from "stream";

// ترتيب الأعمدة في القالب (0-أساس):
// 0 الاسم الأول | 1 الاسم الأخير | 2 اسم الأب | 3 اسم الأم | 4 الجنس |
// 5 الصفّ | 6 البريد | 7 هاتف الطالب | 8 هاتف ولي الأمر | 9 العنوان | 10 كلمة السرّ
export const TEMPLATE_HEADERS = [
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

const COLS = TEMPLATE_HEADERS.length;

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    // نصّ غنيّ أو رابط بريد.
    const obj = value as { text?: string; result?: unknown };
    if (typeof obj.text === "string") return obj.text.trim();
    if (obj.result != null) return String(obj.result).trim();
    return "";
  }
  return String(value).trim();
}

/** يقرأ أول ورقة ويُعيد صفوف البيانات (بلا العنوان) كمصفوفات نصّية. */
export async function parseStudentsFile(
  buffer: Buffer,
  filename: string
): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  let ws: ExcelJS.Worksheet;
  if (filename.toLowerCase().endsWith(".csv")) {
    ws = await wb.csv.read(Readable.from(buffer));
  } else {
    // cast: تباين بين Buffer في @types/node و exceljs.
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    ws = wb.worksheets[0];
  }
  if (!ws) return [];

  const rows: string[][] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // صفّ العناوين
    const cells: string[] = [];
    for (let c = 1; c <= COLS; c++) {
      cells.push(cellText(row.getCell(c).value));
    }
    if (cells.some((x) => x !== "")) rows.push(cells);
  });
  return rows;
}

export function parseGender(v: string): "MALE" | "FEMALE" | null {
  const s = v.trim().toLowerCase();
  if (["ذكر", "ذ", "male", "m", "1"].includes(s)) return "MALE";
  if (["أنثى", "انثى", "أ", "ا", "female", "f", "2"].includes(s)) return "FEMALE";
  return null;
}

export function randomPassword(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export interface ParsedRow {
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  gender: "MALE" | "FEMALE";
  gradeCell: string;
  email: string;
  studentPhone: string;
  parentPhone: string;
  address: string;
  password: string;
}

/** يحوّل صفّاً خاماً إلى بيانات صالحة أو رسالة خطأ. */
export function validateRow(
  cells: string[]
): { ok: true; row: ParsedRow } | { ok: false; reason: string } {
  const [
    firstName,
    lastName,
    fatherName,
    motherName,
    genderRaw,
    gradeCell,
    email,
    studentPhone,
    parentPhone,
    address,
    password,
  ] = cells;

  if (!firstName) return { ok: false, reason: "الاسم الأول مفقود" };
  if (!lastName) return { ok: false, reason: "الاسم الأخير مفقود" };
  if (!fatherName) return { ok: false, reason: "اسم الأب مفقود" };
  const gender = parseGender(genderRaw);
  if (!gender) return { ok: false, reason: "الجنس غير صالح (ذكر/أنثى)" };

  return {
    ok: true,
    row: {
      firstName,
      lastName,
      fatherName,
      motherName,
      gender,
      gradeCell,
      email,
      studentPhone,
      parentPhone,
      address,
      password,
    },
  };
}
