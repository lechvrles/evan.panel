import { getAdminClient, requireEmployee } from "./_admin.js";

export default async function handler(req, res) {
  try {
    await requireEmployee(req, getAdminClient());
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const fileId = req.query.file_id;
  const callId = req.query.call_id;
  if (!fileId || !callId) {
    return res.status(400).json({ error: "file_id and call_id required" });
  }

  const token = process.env.TELEFONCHY_TOKEN;
  if (!token) return res.status(500).json({ error: "TELEFONCHY_TOKEN missing" });

  const url = `https://panel.telefonchy.com/my/calls/voice?file_id=${encodeURIComponent(
    fileId
  )}&cuid=${encodeURIComponent(callId)}`;

  try {
    const providerRes = await fetch(url, { headers: { "webservice-token": token } });
    if (!providerRes.ok) {
      return res
        .status(502)
        .json({ error: "provider failed", status: providerRes.status });
    }
    const contentType = providerRes.headers.get("content-type") || "audio/mpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    const buffer = Buffer.from(await providerRes.arrayBuffer());
    res.status(200).send(buffer);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
