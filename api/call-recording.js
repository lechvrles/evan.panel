import { getAdminClient, requireEmployee } from "./_admin.js";

const BASE = "https://panel.telefonchy.com/webservice/v1";

async function tryFetch(url, token) {
  try {
    const res = await fetch(url, { headers: { "webservice-token": token } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!/audio|octet-stream/i.test(type)) {
      console.log("not audio:", type, url);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) {
      console.log("too small:", buf.length, url);
      return null;
    }
    return { buf, type };
  } catch (e) {
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
  const recordId = req.query.record_id || req.query.file_id;

  if (!cuid || !recordId) {
    return res.status(400).json({ error: "cuid و record_id/file_id هر دو الزامی هستند" });
  }

  const token = process.env.TELEFONCHY_TOKEN;
  if (!token) return res.status(500).json({ error: "TELEFONCHY_TOKEN missing" });

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

    const buffer = providerRes.buf;
    res.setHeader("Content-Type", providerRes.type || "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("call-recording error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
