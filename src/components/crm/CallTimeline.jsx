import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, MessageSquare, ClipboardEdit, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(start, end) {
  if (!start || !end) return null;
  const d = Math.max(0, end - start);
  const m = Math.floor(d / 60);
  const s = d % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function CallTimeline({ customerId, customerName, refreshKey, onAddReport }) {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audioUrls, setAudioUrls] = useState({});
  const [audioLoading, setAudioLoading] = useState({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("call_reports")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      if (!active) return;
      setReports(error ? [] : data || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [customerId, refreshKey]);

  // برای هر گزارشی که call_id داره، فایل صوتی رو با توکن کارمند می‌گیریم
  // و به‌صورت Blob محلی نگه می‌داریم (چون تگ audio نمی‌تونه هدر بفرسته)
  useEffect(() => {
    if (!reports?.length) return;
    const withCall = reports.filter((r) => r.call_id && !audioUrls[r.id]);
    if (!withCall.length) return;

    let createdUrls = [];
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      for (const r of withCall) {
        setAudioLoading((prev) => ({ ...prev, [r.id]: true }));
        try {
          const res = await fetch(
            `/api/call-recording?cuid=${encodeURIComponent(r.call_id)}`,
            { headers: { Authorization: `Bearer ${session?.access_token}` } }
          );
          if (!res.ok || cancelled) {
            setAudioLoading((prev) => ({ ...prev, [r.id]: false }));
            continue;
          }
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          createdUrls.push(objUrl);
          if (!cancelled) {
            setAudioUrls((prev) => ({ ...prev, [r.id]: objUrl }));
          }
        } catch {
          // بی‌صدا رد می‌شیم؛ اگه فایل نبود، پخش‌کننده اصلاً نشون داده نمی‌شه
        } finally {
          setAudioLoading((prev) => ({ ...prev, [r.id]: false }));
        }
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  const isEmpty = !loading && reports?.length === 0;

  return (
    <div className="rounded-[28px] bg-card border border-border shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-heading text-base font-semibold">{customerName}</h2>
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto px-6 py-5 flex flex-col",
          isEmpty ? "items-center justify-center" : "space-y-4"
        )}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : isEmpty ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">هنوز گزارشی ثبت نشده.</p>
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="max-w-[85%] mr-auto rounded-2xl rounded-tr-sm bg-emerald-50/90 border border-emerald-200/70 px-4 py-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 mb-1.5 border-b border-emerald-200/50 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                  {formatDate(r.created_at)}
                </span>
                {r.subject && (
                  <span className="bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-900 font-medium">
                    {r.subject}
                  </span>
                )}
              </div>

              {r.report && (
                <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">
                  {r.report}
                </p>
              )}

              {formatDuration(r.start_time, r.end_time) && (
                <div className="flex items-center gap-2 mt-2 text-xs text-emerald-800/80">
                  <span>مدت: {formatDuration(r.start_time, r.end_time)}</span>
                </div>
              )}

              {r.call_id && (
                <div className="mt-3 pt-2.5 border-t border-emerald-200/60">
                  {audioUrls[r.id] ? (
                    <audio controls className="w-full h-9 rounded-lg">
                      <source src={audioUrls[r.id]} type="audio/mpeg" />
                      مرورگر شما از پخش صوت پشتیبانی نمی‌کند.
                    </audio>
                  ) : audioLoading[r.id] ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-800/70">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      در حال دریافت فایل صوتی…
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onAddReport(new Date().toISOString())}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground grid place-items-center hover:opacity-90 active:scale-95 transition-all shadow-sm"
          aria-label="ثبت گزارش تماس"
          title="ثبت گزارش تماس"
        >
          <ClipboardEdit className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}