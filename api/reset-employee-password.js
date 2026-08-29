import { getAdminClient, requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdminClient();

  try {
    await requireAdmin(req, admin);

    const { employeeId, newPassword } = req.body || {};
    if (!employeeId || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: "شناسه کارمند الزامی و رمز جدید باید حداقل ۶ کاراکتر باشد",
      });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(employeeId, {
      password: newPassword,
    });
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "خطای سرور" });
  }
}
