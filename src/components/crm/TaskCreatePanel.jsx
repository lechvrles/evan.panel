import React, { useEffect, useState } from "react";
import { X, Loader2, ListTodo } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import JalaliDatePicker from "./JalaliDatePicker";

export default function TaskCreatePanel({ open, onClose, onSaved, customerId, customerName }) {
  const { employee } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [subject, setSubject] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubject("");
    setAssigneeId(employee?.id || "");
    setDueDate(null);
    setNote("");
    setError("");
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, position, status")
        .order("full_name", { ascending: true });
      if (active) setEmployees((data || []).filter((e) => e.status !== "inactive"));
    })();
    return () => {
      active = false;
    };
  }, [open, employee?.id]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError("موضوع وظیفه را وارد کنید");
      return;
    }
    if (!assigneeId) {
      setError("کاربر مسئول را انتخاب کنید");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let due = null;
      if (dueDate) {
        const d = new Date(dueDate);
        d.setHours(23, 59, 59, 0); // مهلت تا پایان همان روز
        due = d.toISOString();
      }

      const { error: insertError } = await supabase.from("tasks").insert([
        {
          customer_id: customerId,
          subject: subject.trim(),
          assignee_id: assigneeId,
          created_by: employee?.id || null,
          due_date: due,
          note: note.trim() || null,
        },
      ]);
      if (insertError) throw insertError;

      // اعلان برای کاربر مسئول (اگر خودش نیست)
      if (assigneeId !== employee?.id) {
        await supabase.from("notifications").insert([
          {
            employee_id: assigneeId,
            message: `📌 وظیفه جدید برای مشتری ${customerName}: ${subject.trim()}`,
          },
        ]);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "ایجاد وظیفه ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-card rounded-[28px] border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">ایجاد وظیفه</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent grid place-items-center text-muted-foreground"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            مشتری: <span className="font-medium text-foreground">{customerName}</span>
          </p>

          <div className="space-y-1.5">
            <Label>موضوع</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثلاً: ارسال پیش‌فاکتور"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>انتخاب کاربر</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="کاربر مسئول را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name || "بدون نام"}
                    {emp.position ? ` — ${emp.position}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>مهلت زمانی</Label>
            <JalaliDatePicker value={dueDate} onChange={setDueDate} />
          </div>

          <div className="space-y-1.5">
            <Label>یادداشت</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="توضیحات وظیفه…"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="destructive" onClick={onClose} disabled={saving}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "ایجاد"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
