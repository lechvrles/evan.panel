import { getAdminClient, requireEmployee } from "./_admin.js";

const BASE = "https://panel.telefonchy.com/webservice/v1";

async function findFileId(token, cuid) {
  const res = await fetch(`${BASE}/calls`, {
    headers: { "webservice-token": token, Accept: "application/json" },
  });

  const raw = await res.text();
  console.log("calls list status:", res.status);
  console.log("calls list raw (first 1500 chars):", raw.slice(0, 1500));

  if (!res.ok) {
    throw new Error(`calls list failed: ${res.status}`);
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error("calls list: response was not valid JSON");
    return null;
  }

  const list = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.data?.items)
    ? json.data.items
    : Array.isArray(json?.data?.calls)
    ? json.data.calls
    : Array.isArray(json)
    ? json
    : [];

  console.log("calls list count:", list.length);
  if (list.length) {
    console.log("calls list sample item keys:", Object.keys(list[0]));
    console.log("calls list sample item:", JSON.stringify(list[0]));
  }

  const match = list.find(
    (c) => String(c.cuid) === String(cuid) || String(c.call_id) === String(cuid)
  );

  if (!match) {
    console.log("no match found for cuid:", cuid, "among", list.length, "items");
  } else {
    console.log("matched item:", JSON.stringify(match));
  }

  return match?.file_id || match?.file_record || null;
}

export default async function handler(req, res) {
  try {
    await requireEmployee(req, getAdminClient());
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const cuid = req.query.cuid || req.query.call_id;
  if (!cuid) return res.status(400).json({ error: "cuid الزامی است" });

  const token = process.env.TELEFONCHY_TOKEN;
  if (!token) return res.status(500).json({ error: "TELEFONCHY_TOKEN missing" });

  try {
    let fileId = req.query.file_id;
    if (!fileId || fileId === "0" || fileId === "null") {
      fileId = await findFileId(token, cuid);
    }
    if (!fileId) {
      return res.status(404).json({ error: "این تماس ضبط نشده است" });
    }

    const url = `${BASE}/calls/record?file_id=${encodeURIComponent(
      fileId
    )}&cuid=${encodeURIComponent(cuid)}`;

    const providerRes = await fetch(url, { headers: { "webservice-token": token } });

    if (!providerRes.ok) {
      const detail = await providerRes.text();
      console.error("record fetch failed:", providerRes.status, detail);
      return res.status(502).json({ error: "دریافت فایل صوتی ناموفق بود" });
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