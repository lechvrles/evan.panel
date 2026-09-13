import { getAdminClient } from "./_admin.js";

function last10(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-10);
}

async function fetchAndStoreRecording(admin, { fileId, cuid, callId }) {
  const token = process.env.TELEFONCHY_TOKEN;
  if (!token || !fileId || !cuid) return null;

  try {
    const url = `https://panel.telefonchy.com/webservice/v1/calls/record?file_id=${encodeURIComponent(
      fileId
    )}&cuid=${encodeURIComponent(cuid)}`;
    const providerRes = await fetch(url, {
      headers: { "webservice-token": token },
    });
    if (!providerRes.ok) return null;

    const buffer = Buffer.from(await providerRes.arrayBuffer());
    const path = `${callId || cuid}-${Date.now()}.mp3`;

    const { error: uploadError } = await admin.storage
      .from("call-recordings")
      .upload(path, buffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) return null;
    return path;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = { ...(req.query || {}), ...(req.body || {}) };

    const {
      call_id,
      type,
      trunk,
      status,
      call_source,
      call_dest,
      time_wait,
      time_talk,
      created_at,
      ended_at,
      file_record, // شناسه‌ی فایل صوتی (برای endpoint دریافت صوت)
      cuid, // شناسه‌ی یکتای تماس
    } = body;

    const customerPhone = type === "incoming" ? call_source?.number : call_dest?.number;

    const admin = getAdminClient();

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

    const recordingPath = await fetchAndStoreRecording(admin, {
      fileId: file_record,
      cuid,
      callId: call_id,
    });

    await admin.from("call_logs").insert([
      {
        phone: customerPhone || null,
        matched_customer_id: matchedCustomerId,
        recording_path: recordingPath,
        raw_payload: {
          call_id,
          type,
          trunk,
          status,
          call_source,
          call_dest,
          time_wait,
          time_talk,
          created_at,
          ended_at,
        },
      },
    ]);

    // بهترین‌تلاش: آخرین گزارش‌تماسِ ثبت‌شده برای همین مشتری که هنوز صوت نداره رو پیدا کن و صوت رو بهش وصل کن
    if (recordingPath && matchedCustomerId) {
      const { data: pendingReport } = await admin
        .from("call_reports")
        .select("id")
        .eq("customer_id", matchedCustomerId)
        .is("recording_path", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingReport) {
        await admin
          .from("call_reports")
          .update({ recording_path: recordingPath })
          .eq("id", pendingReport.id);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("telefonchy-webhook error:", err);
    return res.status(200).json({ ok: false });
  }
}
