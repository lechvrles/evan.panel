import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, MessageSquare, ClipboardEdit, PhoneCall, Download } from "lucide-react";
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

  const isEmpty = !loading && reports?.length === 0;

  return (
    <div className="rounded-[28px] bg-card border border-border shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-heading text-base font-semibold">{customerName}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">تاریخچه تماس‌ها</p>
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
              {/* تایتل شامل تاریخ و زمان تماس */}
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

              {/* گزارش متنی */}
              {r.report && (
                <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap leading-relaxed">
                  {r.report}
                </p>
              )}

              {/* مدت مکالمه */}
              <div className="flex items-center gap-2 mt-2 text-xs text-emerald-800/80">
                {formatDuration(r.start_time, r.end_time) && (
                  <span>مدت: {formatDuration(r.start_time, r.end_time)}</span>
                )}
              </div>

              {/* پخش و دانلود صوت تماس */}
              {r.audio_url && (
                <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex flex-col gap-2">
                  <audio controls className="w-full h-9 rounded-lg">
                    <source src={r.audio_url} type="audio/mpeg" />
                    مرورگر شما از پخش صوت پشتیبانی نمی‌کند.
                  </audio>
                  <div className="flex justify-end">
                    <a
                      href={r.audio_url}
                      download="call-recording.mp3"
                      className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-950 font-medium transition-colors bg-emerald-100/70 px-2.5 py-1 rounded-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      دانلود صوت تماس
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onAddReport(Math.floor(Date.now() / 1000))}
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
