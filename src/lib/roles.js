// نگاشت مقدار انگلیسیِ ذخیره‌شده در دیتابیس به برچسب فارسی برای نمای// نگاشت مقدار انگلیسیِ ذخیره‌شده در دیتابیس به برچسب فارسی برای نمایش
export const ROLE_LABELS = {
  admin: "ادمین",
  manager: "مدیر",
  employee: "کارمند",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || "—";
}

export const ROLE_OPTIONS = [
  { value: "employee", label: "کارمند" },
  { value: "manager", label: "مدیر" },
  { value: "admin", label: "ادمین" },
];

// «سمت شغلی» صرفاً یک عنوان نمایشی است و هیچ تاثیری روی سطح دسترسی ندارد.
export const POSITION_SUGGESTIONS = [
  "توسعه‌دهنده",
  "مدیر کل",
  "مدیر بازرگانی",
  "کارشناس فروش",
  "پشتیبانی مشتریان",
  "حسابدار",
  "پشتیبانی فنی",
];
