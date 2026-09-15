import { getAdminClient, requireEmployee } from "./_admin.js";

const BASE = "https://panel.telefonchy.com/webservice/v1";

// طبق مستندات: اول باید لیست تماس‌ها را گرفت و file_id تماس موردنظر را
// از روی cuid پیدا کرد. خود CDR معمولاً file_id را نمی‌فرستد.
async function findFileId(token, cuid) {
  const res = await fetch(`${BASE}/calls`, {
    headers: { "webservice-token": token, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`calls list failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();

  // ساختار خروجی ممکن است data آرایه باشد یا data.items؛ هر دو را پوشش می‌دهیم
  const list = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.data?.items)
    ? json.data.items
    : Array.isArray(json)
    ? json
    : [];

  const match = list.find(
    (c) => String(c.cuid) === String(cuid) || String(c.call_id) === String(cuid)
  );

  return match?.file_id || match?.file_record || null;
}

export default async function handler(req, res) {
  try {
    await requireEmployee(req, getAdminClient());
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  // cuid همان call_id در CDR است
  const cuid = req.query.cuid || req.query.call_id;
  if (!cuid) {
    return res.status(400).json({ error: "cuid (یا call_id) الزامی است" });
  }

  const token = process.env.TELEFONCHY_TOKEN;
  if (!token) return res.status(500).json({ error: "TELEFONCHY_TOKEN missing" });

  try {
    // اگر file_id معتبری از قبل داریم استفاده کن، وگرنه از لیست تماس‌ها پیدایش کن
    let fileId = req.query.file_id;
    if (!fileId || fileId === "0" || fileId === "null") {
      fileId = await findFileId(token, cuid);
    }

    if (!fileId) {
      return res.status(404).json({
        error: "فایل صوتی برای این تماس موجود نیست (تماس ضبط نشده است)",
      });
    }

    const url = `${BASE}/calls/record?file_id=${encodeURIComponent(
      fileId
    )}&cuid=${encodeURIComponent(cuid)}`;

    const providerRes = await fetch(url, {
      headers: { "webservice-token": token },
    });

    if (!providerRes.ok) {
      const detail = await providerRes.text();
      console.error("record fetch failed:", providerRes.status, detail);
      return res.status(502).json({
        error: "دریافت فایل صوتی از تلفن‌چی ناموفق بود",
        status: providerRes.status,
      });
    }

    const buffer = Buffer.from(await providerRes.arrayBuffer());
    res.setHeader("Content-Type", providerRes.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("call-recording error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
