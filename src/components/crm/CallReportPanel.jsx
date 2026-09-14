import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, ClipboardEdit, Timer, Zap } from "lucide-react";

function pad(n) {
  return String(n).padStart(2, "0");
}

function isoToLocalParts(iso) {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function nowParts() {
  return isoToLocalParts(new Date().toISOString());
}

function toUnix(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

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
  autoStartIso, // وقتی از دکمه‌ی تماس داخل پروفایل باز شده، زمان واقعی از API میاد
}) {
  const { employee } = useAuth();
  const [subject, setSubject] = useState("");
  const [callDate, setCallDate] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [report, setReport] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const parts = autoStartIso ? isoToLocalParts(autoStartIso) : nowParts();
    setSubject("");
    setCallDate(parts.date);
    setStartTimeStr(parts.time);
    setEndTimeStr("");
    setReport("");
    setError("");
  }, [open, autoStartIso]);

  if (!open) return null;

  const startUnix = toUnix(callDate, startTimeStr);
  const endUnix = toUnix(callDate, endTimeStr);
  const duration = startUnix != null && endUnix != null ? Math.max(0, endUnix - startUnix) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const end = endUnix ?? Math.floor(Date.now() / 1000);
      let recordingPath = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: recentCall } = await supabase
          .from("call_logs")
          .select("recording_path")
          .eq("matched_customer_id", customerId)
          .not("recording_path", "is", null)
          .order("received_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recentCall?.recording_path) {
          recordingPath = recentCall.recording_path;
          break;
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
      }

      const { error: insertError } = await supabase.from("call_reports").insert([
        {
          customer_id: customerId,
          employee_id: employee?.id || null,
          subject: subject.trim(),
          start_time: startUnix,
          end_time: end,
          report: report.trim(),
          recording_path: recordingPath,
        },
      ]);
      if (insertError) throw insertError;

      const d = startUnix != null ? Math.max(0, end - startUnix) : null;
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              تماس با <span className="font-medium text-foreground">{customerName}</span>
            </p>
            {autoStartIso && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" />
                زمان از تماس زنده
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>موضوع تماس</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثلاً: پیگیری سفارش"
            />
          </div>

          <div className="space-y-1.5">
            <Label>تاریخ تماس</Label>
            <Input
              type="date"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              className="h-11 rounded-xl bg-accent/40 border-transparent focus-visible:border-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ساعت شروع</Label>
              <Input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="h-11 text-center font-mono tracking-wide rounded-xl bg-accent/40 border-transparent focus-visible:border-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ساعت پایان</Label>
              <div className="flex gap-1.5">
                <Input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="h-11 text-center font-mono tracking-wide rounded-xl bg-accent/40 border-transparent focus-visible:border-ring flex-1"
                />
                <button
                  type="button"
                  onClick={() => setEndTimeStr(nowParts().time)}
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
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  در حال دریافت فایل صوتی و ثبت…
                </>
              ) : (
                "ثبت گزارش"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

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
                زمان تماس (HHMM)
              </Label>
              <Input
                type="text"
                maxLength={4}
                value={timeInput}
                onChange={(e) => handleTimeInput(e.target.value)}
                placeholder="مثال: 1430"
                className="h-11 text-center font-mono tracking-widest rounded-xl bg-accent/40 border-transparent focus-visible:border-ring"
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
              rows={4}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="خلاصه‌ی مکالمه را بنویسید…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>لینک فایل صوتی (اختیاری)</Label>
            <Input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://.../recording.mp3"
              className="text-xs font-mono"
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
