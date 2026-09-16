import { getAdminClient, requireEmployee } from "./_admin.js";

const BASE = "https://panel.telefonchy.com/webservice/v1";

export default async function handler(req, res) {
  try {
    await requireEmployee(req, getAdminClient());
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  // طبق مستندات «دریافت صوت تماس»: فقط cuid و record_id لازمه، نه file_id و نه service_id
  const cuid = req.query.cuid;
  const recordId = req.query.record_id;
  const quality = ["rx", "tx", "merged"].includes(req.query.quality)
    ? req.query.quality
    : "merged";

  if (!cuid || !recordId) {
    return res.status(400).json({ error: "cuid و record_id هر دو الزامی هستند" });
  }

  const token = process.env.TELEFONCHY_TOKEN;
  if (!token) return res.status(500).json({ error: "TELEFONCHY_TOKEN missing" });
  console.log("DEBUG: Token exists:", !!token);

  try {
    const url = `${BASE}/calls/record-quality/${quality}?cuid=${encodeURIComponent(
      cuid
    )}&record_id=${encodeURIComponent(recordId)}`;

    console.log("DEBUG: Full URL being requested:", url);
    const providerRes = await fetch(url, { headers: { "webservice-token": token } });

    if (!providerRes.ok) {
      let detail = "";
      try {
        detail = await providerRes.text();
      } catch {
        /* ignore */
      }
      console.error("record-quality fetch failed:", providerRes.status, detail.slice(0, 500));
      return res
        .status(providerRes.status === 404 ? 404 : 502)
        .json({ error: "دریافت فایل صوتی ناموفق بود", upstreamStatus: providerRes.status });
    }

    const buffer = Buffer.from(await providerRes.arrayBuffer());
    res.setHeader("Content-Type", providerRes.headers.get("content-type") || "audio/wav");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("call-recording error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
