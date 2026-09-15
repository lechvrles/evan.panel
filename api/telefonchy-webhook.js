import { getAdminClient } from "./_admin.js";

function last10(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-10);
}

function num(v) {
  if (v == null) return null;
  if (typeof v === "object") return v.number || v.num || null;
  return String(v);
}

async function downloadAndStore(admin, url, pathName) {
  const token = process.env.TELEFONCHY_TOKEN;
  if (!token || !url) {
    console.error("recording skip: no token or url", { hasToken: !!token, hasUrl: !!url });
    return null;
  }
  try {
    const res = await fetch(url, { headers: { "webservice-token": token } });
    if (!res.ok) {
      console.error("recording download failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 200) {
      console.error("recording suspiciously small:", buffer.length);
      return null;
    }
    const { error } = await admin.storage
      .from("call-recordings")
      .upload(pathName, buffer, { contentType: "audio/mpeg", upsert: true });
    if (error) {
      console.error("recording upload failed:", error.message);
      return null;
    }
    return pathName;
  } catch (e) {
    console.error("recording error:", e.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = { ...(req.query || {}), ...(req.body || {}) };
    console.log("telefonchy webhook:", JSON.stringify(body));

    const admin = getAdminClient();
    const event = body.event || null;

    // ─── رویداد صوت: recording.merged.ready ───
    if (event === "recording.merged.ready" || (body.download_url && body.cuid)) {
      const callId = body.call_id || body.cuid;
      const path = await downloadAndStore(admin, body.download_url, `${callId}-${Date.now()}.mp3`);
      if (!path) return res.status(200).json({ ok: true, stored: false });

      const { data: logRow } = await admin
        .from("call_logs")
        .select("id, matched_customer_id")
        .eq("call_id", callId)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logRow) {
        await admin.from("call_logs").update({ recording_path: path }).eq("id", logRow.id);

        if (logRow.matched_customer_id) {
          const { data: pending } = await admin
            .from("call_reports")
            .select("id")
            .eq("customer_id", logRow.matched_customer_id)
            .is("recording_path", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (pending) {
            await admin.from("call_reports").update({ recording_path: path }).eq("id", pending.id);
            console.log("recording attached to report", pending.id);
          }
        }
      } else {
        console.error("no call_logs row for call_id", callId);
      }
      return res.status(200).json({ ok: true, stored: true, path });
    }

    // ─── رویداد پایان تماس ───
    const { call_id, type, call_source, call_dest, file_id } = body;
    const customerPhone = type === "incoming" ? num(call_source) : num(call_dest);

    let matchedCustomerId = null;
    if (customerPhone) {
      const { data: match } = await admin
        .from("customers")
        .select("id")
        .ilike("phone", `%${last10(customerPhone)}`)
        .limit(1)
        .maybeSingle();
      matchedCustomerId = match?.id || null;
    }

    // دانلود صوت بلافاصله بعد از پایان تماس
    let recordingPath = null;
    if (file_id && file_id !== "0" && call_id) {
      const recUrl = `https://panel.telefonchy.com/my/calls/voice?file_id=${encodeURIComponent(
        file_id
      )}&cuid=${encodeURIComponent(call_id)}`;
      recordingPath = await downloadAndStore(admin, recUrl, `${call_id}.mp3`);
    }

    const { error: insertError } = await admin.from("call_logs").insert([
      {
        phone: customerPhone || null,
        matched_customer_id: matchedCustomerId,
        call_id: call_id || null,
        recording_path: recordingPath,
        raw_payload: body,
      },
    ]);
    if (insertError) console.error("call_logs insert failed:", insertError.message);

    // وصل‌کردن به آخرین گزارش بی‌صوت همان مشتری
    if (recordingPath && matchedCustomerId) {
      const { data: pending } = await admin
        .from("call_reports")
        .select("id")
        .eq("customer_id", matchedCustomerId)
        .is("recording_path", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending) {
        await admin.from("call_reports").update({ recording_path: recordingPath }).eq("id", pending.id);
        console.log("recording attached to report", pending.id);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("telefonchy-webhook error:", err);
    return res.status(200).json({ ok: false });
  }
}
