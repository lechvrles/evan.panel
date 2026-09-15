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

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = { ...(req.query || {}), ...(req.body || {}) };
    console.log("telefonchy webhook:", JSON.stringify(body));

    const admin = getAdminClient();
    const event = body.event || null;

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

    // فقط درج در call_logs با file_id و call_id
    if (event !== "recording.merged.ready") {
      const { error: insertError } = await admin.from("call_logs").insert([
        {
          phone: customerPhone || null,
          matched_customer_id: matchedCustomerId,
          call_id: call_id || null,
          file_id: file_id && file_id !== "0" ? file_id : null,
          raw_payload: body,
        },
      ]);
      if (insertError) console.error("call_logs insert failed:", insertError.message);

      // وصل‌کردن به آخرین گزارش بی‌شناسه همان مشتری
      if (file_id && call_id && matchedCustomerId) {
        const { data: pending } = await admin
          .from("call_reports")
          .select("id")
          .eq("customer_id", matchedCustomerId)
          .or("file_id.is.null,call_id.is.null")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pending) {
          await admin
            .from("call_reports")
            .update({ file_id, call_id })
            .eq("id", pending.id);
          console.log("recording ids attached to report", pending.id);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("telefonchy-webhook error:", err);
    return res.status(200).json({ ok: false });
  }
}
