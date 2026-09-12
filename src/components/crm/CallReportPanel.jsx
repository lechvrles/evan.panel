import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, PhoneCall } from "lucide-react";

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

      const duration = start && end ? Math.max(0, end - start) : null;
      const parts = [
        `📝 گزارش تماس با ${customerName}`,
        subject.trim() ? `موضوع: ${subject.trim()}` : null,
        duration != null
          ? `مدت: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
          : null,
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
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full sm:w-1/2 bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-primary" />
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>شروع مکالمه</Label>
              <Input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>پایان مکالمه</Label>
              <Input
                type="number"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="خالی = الان"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>گزارش</Label>
            <textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={8}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="خلاصه‌ی مکالمه را بنویسید…"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
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
