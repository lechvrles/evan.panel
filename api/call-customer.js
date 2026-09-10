import { getAdminClient, requireEmployee } from "./_admin.js";

function normalizePhone(raw) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  let out = "";
  for (const ch of String(raw)) {
    const pIdx = persianDigits.indexOf(ch);
    const aIdx = arabicDigits.indexOf(ch);
    if (pIdx > -1) out += pIdx;
    else if (aIdx > -1) out += aIdx;
    else if (/[0-9]/.test(ch)) out += ch;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdminClient();

  try {
    const { callerId } = await requireEmployee(req, admin);

    const { phone } = req.body || {};
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 10) {
      return res.status(400).json({ error: "شماره تلفن نامعتبر است" });
    }

    const { data: emp } = await admin
      .from("employees")
      .select("extension")
      .eq("id", callerId)
      .maybeSingle();

    if (!emp?.extension) {
      return res.status(400).json({
        error: "داخلی شما ثبت نشده. از مدیر بخواهید در «مدیریت کارمندان» داخلی‌تان را تنظیم کند.",
      });
    }

    const TELEFONCHY_TOKEN = process.env.TELEFONCHY_TOKEN;
    const TELEFONCHY_SERVICE_ID = process.env.TELEFONCHY_SERVICE_ID;

    if (!TELEFONCHY_TOKEN || !TELEFONCHY_SERVICE_ID) {
      return res.status(500).json({
        error: "تنظیمات تلفن‌چی روی سرور کامل نیست (TELEFONCHY_TOKEN / TELEFONCHY_SERVICE_ID)",
      });
    }

    const query = new URLSearchParams({
      service_id: TELEFONCHY_SERVICE_ID,
      exten: emp.extension,
      to: normalized,
    });

    const providerRes = await fetch(
      `https://panel.telefonchy.com/webservice/v1/smartcall?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "webservice-token": TELEFONCHY_TOKEN,
        },
      }
    );

    const providerJson = await providerRes.json().catch(() => ({}));

    if (!providerRes.ok || providerJson.code !== 200) {
      return res.status(400).json({
        error: providerJson.message || "سرویس تلفن‌چی درخواست را رد کرد",
      });
    }

    // ثبت درخواست برای پیگیری بعدی (با request_id می‌توان بعداً وضعیت را استعلام کرد)
    await admin.from("call_logs").insert([
      {
        phone: normalized,
        raw_payload: { direction: "outgoing_click_to_call", ...providerJson.data },
      },
    ]);

    return res.status(200).json({ ok: true, request_id: providerJson.data?.request_id });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "خطای سرور" });
  }
}
