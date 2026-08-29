import { getAdminClient, requireAdmin } from "./_admin.js";

const INTERNAL_EMAIL_DOMAIN = "evan-crm.internal";
const toInternalEmail = (username) =>
  `${String(username).trim().toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdminClient();

  try {
    await requireAdmin(req, admin);

    const { username, password, full_name, role } = req.body || {};
    if (!username || !password || password.length < 6) {
      return res.status(400).json({
        error: "نام کاربری الزامی و رمز عبور باید حداقل ۶ کاراکتر باشد",
      });
    }
    const safeRole = role === "admin" ? "admin" : "employee";

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: toInternalEmail(username),
      password,
      email_confirm: true,
      user_metadata: {
        username: String(username).trim().toLowerCase(),
        full_name: full_name || "",
        role: safeRole,
      },
    });

    if (createError) {
      const message = /already registered|already exists/i.test(createError.message)
        ? "این نام کاربری قبلاً ثبت شده است"
        : createError.message;
      return res.status(400).json({ error: message });
    }

    // اطمینان از اینکه role درست ست شده (تریگر پیش‌فرض روی employee هم کار می‌کند)
    if (safeRole === "admin") {
      await admin.from("employees").update({ role: "admin" }).eq("id", created.user.id);
    }

    return res.status(200).json({ ok: true, id: created.user.id });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "خطای سرور" });
  }
}
