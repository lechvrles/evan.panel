import { getAdminClient, requireEmployee } from "./_admin.js";

const BASE = "https://panel.telefonchy.com/webservice/v1";

async function tryFetch(url, token) {
  console.log("trying:", url);
  try {
    const res = await fetch(url, { headers: { "webservice-token": token } });
    if (res.ok) {
      console.log("SUCCESS:", url);
      return res;
    }
    const detail = await res.text().catch(() => "");
    console.log("failed:", res.status, detail.slice(0, 300));
    return null;
  } catch (e) {
    console.log("fetch threw:", e.message);
    return null;
  }
}

export default async function handler(req, res) {
  try {
    await requireEmployee(req, getAdminClient());
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const cuid = req.query.cuid;
  // فرانت‌اند این رو به اسم record_id می‌فرسته؛ همون file_id هم هست
  const recordId = req.query.record_id || req.query.file_id;

  if (!cuid || !recordId) {
    return res.status(400).json({ error: "cuid و record_id/file_id هر دو الزامی هستند" });
  }

  const token = process.env.TELEFONCHY_TOKEN;
  if (!token) return res.status(500).json({ error: "TELEFONCHY_TOKEN missing" });

  // هر چهار مسیر مستندشده رو به‌ترتیب امتحان می‌کنیم تا یکی جواب بده
  const candidates = [
    `${BASE}/calls/record?file_id=${encodeURIComponent(recordId)}&cuid=${encodeURIComponent(cuid)}`,
    `${BASE}/calls/record-quality/merged?cuid=${encodeURIComponent(cuid)}&record_id=${encodeURIComponent(recordId)}`,
    `${BASE}/calls/record-quality/rx?cuid=${encodeURIComponent(cuid)}&record_id=${encodeURIComponent(recordId)}`,
    `${BASE}/calls/record-quality/tx?cuid=${encodeURIComponent(cuid)}&record_id=${encodeURIComponent(recordId)}`,
  ];

  try {
    let providerRes = null;
    for (const url of candidates) {
      providerRes = await tryFetch(url, token);
      if (providerRes) break;
    }

    if (!providerRes) {
      return res
        .status(404)
        .json({ error: "هیچ فایل صوتی برای این تماس در هیچ‌کدام از مسیرها یافت نشد" });
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
