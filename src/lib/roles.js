// نگاشت مقدار انگلیسیِ ذخیره‌شده در دیتابیس به برچسب فارسی برای نمایش
export const ROLE_LABELS = {
  admin: "مدیر",
  employee: "کارمند",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || "—";
}

export const ROLE_OPTIONS = [
  { value: "employee", label: "کارمند" },
  { value: "admin", label: "مدیر" },
];

// «سمت شغلی» صرفاً یک عنوان نمایشی است و هیچ تاثیری روی سطح دسترسی ندارد.
// این‌ها فقط چند پیشنهاد رایج‌ هستن؛ فیلد مربوطه متن آزاد است و هر عنوان
// دلخواهی قابل وارد کردنه.
export const POSITION_SUGGESTIONS = [
  "توسعه‌دهنده",
  "مدیر کل",
  "مدیر بازرگانی",
  "کارشناس فروش",
  "پشتیبانی مشتریان",
  "حسابدار",
  "طراح",
];
