import { getAdminClient } from "./_admin.js";

function last10(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-10);
}

async function fetchAndStoreRecording(admin, { fileId, cuid, callId }) {
  const token = process.env.TELEFONCHY_TOKEN;
  if (!token || !fileId || !cuid) {
    console.log("recording skip: missing token/fileId/cuid", {
      hasToken: !!token,
      fileId,
      cuid,
    });
    return null;
  }

  try {
    const url = `https://panel.telefonchy.com/webservice/v1/calls/record?file_id=${encodeURIComponent(
      fileId
    )}&cuid=${encodeURIComponent(cuid)}`;
    const providerRes = await fetch(url, {
      headers: { "webservice-token": token },
    });
    if (!providerRes.ok) {
      console.error("recording fetch failed", providerRes.status, await providerRes.text());
      return null;
    }

    const buffer = Buffer.from(await providerRes.arrayBuffer());
    const path = `${callId || cuid}-${Date.now()}.mp3`;

    const { error: uploadError } = await admin.storage
      .from("call-recordings")
      .upload(path, buffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) {
      console.error("recording upload failed:", uploadError);
      return null;
    }
    console.log("recording stored at:", path);
    return path;
  } catch (err) {
    console.error("fetchAndStoreRecording exception:", err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = { ...(req.query || {}), ...(req.body || {}) };
    console.log("telefonchy-webhook received:", JSON.stringify(body));

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
      file_record,
      cuid,
    } = body;

    const customerPhone = type === "incoming" ? call_source?.number : call_dest?.number;

    const admin = getAdminClient();

    let matchedCustomerId = null;
    if (customerPhone) {
      const { data: match, error: matchError } = await admin
        .from("customers")
        .select("id")
        .ilike("phone", `%${last10(customerPhone)}`)
        .limit(1)
        .maybeSingle();
      if (matchError) console.error("customer match error:", matchError);
      matchedCustomerId = match?.id || null;
    }

    const recordingPath = await fetchAndStoreRecording(admin, {
      fileId: file_record,
      cuid,
      callId: call_id,
    });

    const { error: insertError } = await admin.from("call_logs").insert([
      {
        phone: customerPhone || null,
        matched_customer_id: matchedCustomerId,
        recording_path: recordingPath,
        file_record: file_record || null,
        cuid: cuid || null,
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

    if (insertError) {
      console.error("call_logs insert error:", insertError);
    } else {
      console.log("call_logs row inserted OK. recordingPath:", recordingPath);
    }

    if (recordingPath && matchedCustomerId) {
      const { data: pendingReport, error: pendingError } = await admin
        .from("call_reports")
        .select("id")
        .eq("customer_id", matchedCustomerId)
        .is("recording_path", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingError) console.error("pendingReport lookup error:", pendingError);

      if (pendingReport) {
        const { error: attachError } = await admin
          .from("call_reports")
          .update({ recording_path: recordingPath })
          .eq("id", pendingReport.id);
        if (attachError) console.error("attach to call_reports error:", attachError);
        else console.log("attached recording to call_reports:", pendingReport.id);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("telefonchy-webhook error:", err);
    return res.status(200).json({ ok: false });
  }
}
