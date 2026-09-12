import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, MessageSquare, PhoneCall, Plus } from "lucide-react";

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

export default function CallTimeline({ customerId, refreshKey, onAddReport }) {
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

  return (
    <div className="rounded-[28px] bg-card border border-border shadow-sm flex flex-col h-full min-h-[560px]">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-heading text-base font-semibold">تاریخچه تماس‌ها</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">هنوز گزارشی ثبت نشده.</p>
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="max-w-[85%] mr-auto rounded-2xl rounded-tr-sm bg-accent/60 px-4 py-3"
            >
              {r.subject && <p className="text-sm font-medium">{r.subject}</p>}
              {r.report && (
                <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">
                  {r.report}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{formatDate(r.created_at)}</span>
                {formatDuration(r.start_time, r.end_time) && (
                  <>
                    <span>·</span>
                    <span>مدت: {formatDuration(r.start_time, r.end_time)}</span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-4 border-t border-border flex items-center justify-start">
        <button
          type="button"
          onClick={() => onAddReport(Math.floor(Date.now() / 1000))}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground grid place-items-center hover:opacity-90 active:scale-95 transition-all relative"
          aria-label="ثبت گزارش تماس"
          title="ثبت گزارش تماس"
        >
          <PhoneCall className="w-5 h-5" />
          <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white grid place-items-center">
            <Plus className="w-3 h-3" strokeWidth={3} />
          </span>
        </button>
      </div>
    </div>
  );
}
