import { getAdminClient, requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdminClient();

  try {
    const { callerId } = await requireAdmin(req, admin);

    const { employeeId } = req.body || {};
    if (!employeeId) {
      return res.status(400).json({ error: "شناسه کارمند الزامی است" });
    }
    if (employeeId === callerId) {
      return res.status(400).json({ error: "نمی‌توانید حساب خودتان را حذف کنید" });
    }

    // حذف کاربر از auth.users به‌صورت خودکار ردیف employees مرتبط را هم
    // (به‌خاطر on delete cascade) پاک می‌کند.
    const { error: deleteError } = await admin.auth.admin.deleteUser(employeeId);
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "خطای سرور" });
  }
}
