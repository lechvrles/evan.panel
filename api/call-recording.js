import { getAdminClient, requireEmployee } from "./_admin.js";

const BASE = "https://panel.telefonchy.com/webservice/v1";

function sniffAudio(buf) {
  const head = buf.slice(0, 12);
  const s = head.toString("latin1");
  if (s.startsWith("RIFF")) return { fmt: "wav", mime: "audio/wav", ok: true };
  if (s.startsWith("OggS")) return { fmt: "ogg", mime: "audio/ogg", ok: true };
  if (s.startsWith("ID3")) return { fmt: "mp3", mime: "audio/mpeg", ok: true };
  if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return { fmt: "mp3-raw", mime: "audio/mpeg", ok: true };
  if (s.startsWith("#!AMR")) return { fmt: "amr", mime: "audio/amr", ok: false };
  if (s.startsWith("{") || s.startsWith("[")) return { fmt: "json", mime: "text/json", ok: false };
  if (s.startsWith("<")) return { fmt: "html", mime: "text/html", ok: false };
  return { fmt: "unknown", mime: "application/octet-stream", ok: false };
}

async function tryFetch(url, token) {
  try {
    const res = await fetch(url, { headers: { "webservice-token": token } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const sniff = sniffAudio(buf);
    console.log("record probe:", url.split("?")[0], "status:", res.status, "bytes:", buf.length, "type:", sniff.fmt);
    if (buf.length < 100) return null;
    if (!sniff.ok) {
      console.log("NOT AUDIO body sample:", buf.slice(0, 200).toString("utf8"));
      return null;
    }
    return { buf, type: sniff.mime };
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
      return res.status(404).json({
        error: "فایل صوتی معتبر برای این file_id یافت نشد",
        cuid,
        record_id: recordId,
      });
    }

    res.setHeader("Content-Type", providerRes.type);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(providerRes.buf);
  } catch (e) {
    console.error("call-recording error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}