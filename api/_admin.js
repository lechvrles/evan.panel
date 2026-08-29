import { createClient } from "@supabase/supabase-js";

// این فایل فقط سمت سرور (Vercel Serverless Function) اجرا میشه؛ کلید
// service role هرگز به مرورگر ارسال نمیشه.
export function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY یا VITE_SUPABASE_URL تنظیم نشده است");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// تأیید می‌کند که درخواست از طرف یک کارمند لاگین‌شده با نقش ادمین ارسال شده.
export async function requireAdmin(req, admin) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    const err = new Error("توکن احراز هویت ارسال نشده است");
    err.status = 401;
    throw err;
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    const err = new Error("نشست نامعتبر است");
    err.status = 401;
    throw err;
  }

  const { data: emp, error: empError } = await admin
    .from("employees")
    .select("id, role, status")
    .eq("id", userData.user.id)
    .single();

  if (empError || !emp || emp.role !== "admin") {
    const err = new Error("فقط ادمین به این بخش دسترسی دارد");
    err.status = 403;
    throw err;
  }
  if (emp.status === "inactive") {
    const err = new Error("این حساب غیرفعال است");
    err.status = 403;
    throw err;
  }

  return { callerId: userData.user.id };
}
