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

function normalize(body) {
  const d = body && typeof body.data === "object" && body.data !== null ? body.data : {};
  const pick = (key) => body[key] ?? d[key] ?? null;
  return {
    event: pick("event"),
    call_id: pick("call_id"),
    file_id: pick("file_id"),
    type: pick("type"),
    call_source: pick("call_source"),
    call_dest: pick("call_dest"),
    status: pick("status"),
    time_talk: pick("time_talk"),
    date: pick("date"),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const raw = { ...(req.query || {}), ...(req.body || {}) };
    console.log("telefonchy webhook:", JSON.stringify(raw));

    const p = normalize(raw);
    const admin = getAdminClient();

    const call_id = p.call_id != null ? String(p.call_id) : null;
    const file_id = p.file_id != null ? String(p.file_id) : null;
    const customerPhone = p.type === "incoming" ? num(p.call_source) : num(p.call_dest);

    let matchedCustomerId = null;
    const tail = last10(customerPhone);
    if (tail.length === 10) {
      const { data: match } = await admin
        .from("customers")
        .select("id")
        .or(`phone.ilike.%${tail},phone2.ilike.%${tail}`)
        .limit(1)
        .maybeSingle();
      matchedCustomerId = match?.id || null;
    }

    const ourNumber = p.type === "incoming" ? num(p.call_dest) : num(p.call_source);
    let handledByEmployeeId = null;
    if (ourNumber) {
      const { data: empMatch } = await admin
        .from("employees")
        .select("id")
        .eq("extension", ourNumber)
        .maybeSingle();
      handledByEmployeeId = empMatch?.id || null;
    }

    let receivedAt = null;
    if (p.date) {
      const parsed = new Date(p.date);
      if (!isNaN(parsed.getTime())) receivedAt = parsed.toISOString();
    }

    // ✅ رویداد فایل صوتی - هم call_logs و هم call_reports را آپدیت می‌کند
    if (p.event === "recording.merged.ready") {
      if (call_id && file_id && file_id !== "0") {
        // آپدیت call_logs
        const { error: updateLogError } = await admin
          .from("call_logs")
          .update({ file_id, raw_payload: raw })
          .eq("call_id", call_id);
        if (updateLogError) console.error("call_logs update failed:", updateLogError.message);

        const { error: updateReportError } = await admin
          .from("call_reports")
          .update({ file_id })
          .eq("call_id", call_id)
          .is("file_id", null); // فقط گزارش‌هایی که file_id ندارند

        if (updateReportError) {
          console.error("call_reports update failed:", updateReportError.message);
        } else {
          console.log("✅ file_id applied to call_logs and call_reports:", call_id, file_id);
        }
      }
      return res.status(200).json({ ok: true });
    }

    if (!call_id) {
      console.warn("webhook received without call_id:", raw);
      return res.status(200).json({ ok: true, skipped: true });
    }

    const { error: insertError } = await admin
      .from("call_logs")
      .upsert(
        [
          {
            phone: customerPhone || null,
            matched_customer_id: matchedCustomerId,
            employee_id: handledByEmployeeId,
            call_id,
            file_id: file_id && file_id !== "0" ? file_id : null,
            raw_payload: raw,
            ...(receivedAt ? { received_at: receivedAt } : {}),
          },
        ],
        { onConflict: "call_id" }
      );

    if (insertError) {
      console.error("call_logs upsert failed:", insertError.message);
      return res.status(500).json({ ok: false, error: insertError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("telefonchy-webhook error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
