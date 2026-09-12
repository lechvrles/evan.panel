import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, ClipboardEdit, Clock, Timer } from "lucide-react";

function formatDuration(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallReportPanel({
  open,
  onClose,
  onSaved,
  customerId,
  customerName,
  initialStart,
}) {
  const { employee } = useAuth();
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [report, setReport] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSubject("");
      setStartTime(initialStart ? String(initialStart) : String(Math.floor(Date.now() / 1000)));
      setEndTime("");
      setReport("");
      setError("");
    }
  }, [open, initialStart]);

  if (!open) return null;

  const duration =
    startTime && endTime ? Math.max(0, Number(endTime) - Number(startTime)) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const start = startTime ? Number(startTime) : null;
      const end = endTime ? Number(endTime) : Math.floor(Date.now() / 1000);

      const { error: insertError } = await supabase.from("call_reports").insert([
        {
          customer_id: customerId,
          employee_id: employee?.id || null,
          subject: subject.trim(),
          start_time: start,
          end_time: end,
          report: report.trim(),
        },
      ]);
      if (insertError) throw insertError;

      const d = start && end ? Math.max(0, end - start) : null;
      const parts = [
        `📝 گزارش تماس با ${customerName}`,
        subject.trim() ? `موضوع: ${subject.trim()}` : null,
        d != null ? `مدت: ${formatDuration(d)}` : null,
        report.trim() ? `یادداشت: ${report.trim()}` : null,
      ].filter(Boolean);

      await supabase
        .from("notifications")
        .insert([{ employee_id: null, message: parts.join(" — ") }]);

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "ثبت گزارش ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-card rounded-[28px] border border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardEdit className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">گزارش تماس</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent grid place-items-center text-muted-foreground"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            تماس با <span className="font-medium text-foreground">{customerName}</span>
          </p>

          <div className="space-y-1.5">
            <Label>موضوع تماس</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثلاً: پیگیری سفارش"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                شروع مکالمه
              </Label>
              <Input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 text-center font-mono tracking-wide rounded-xl bg-accent/40 border-transparent focus-visible:border-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                پایان مکالمه
              </Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="—"
                  className="h-11 text-center font-mono tracking-wide rounded-xl bg-accent/40 border-transparent focus-visible:border-ring flex-1"
                />
                <button
                  type="button"
                  onClick={() => setEndTime(String(Math.floor(Date.now() / 1000)))}
                  className="h-11 px-3 rounded-xl bg-accent text-xs font-medium hover:bg-accent/70 transition-colors shrink-0"
                >
                  الان
                </button>
              </div>
            </div>
          </div>

          {duration != null && (
            <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-accent/50 text-sm font-mono">
              <Timer className="w-4 h-4 text-muted-foreground" />
              مدت مکالمه: {formatDuration(duration)}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>گزارش</Label>
            <textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={5}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="خلاصه‌ی مکالمه را بنویسید…"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="destructive" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "ثبت گزارش"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
