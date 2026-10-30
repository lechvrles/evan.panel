import React, { useEffect, useState } from "react";
import { ClipboardList, Plus, Loader2, X, Trash2, Check, CalendarClock, User as UserIcon } from "lucide-react";
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
import JalaliDatePicker, { formatJalali } from "./JalaliDatePicker";
import { cn } from "@/lib/utils";

const sortTasks = (list) =>
  [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (da !== db) return da - db;
    return new Date(b.created_at) - new Date(a.created_at);
  });

export default function CustomerTasks({ customerId, customerName }) {
  const { employee } = useAuth();
  const isAdmin = employee?.role === "admin";

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const [{ data: taskRows }, { data: empRows }] = await Promise.all([
        supabase
          .from("tasks")
          .select("*, assignee:assignee_id(full_name)")
          .eq("customer_id", customerId),
        supabase
          .from("employees")
          .select("id, full_name, position, status")
          .order("full_name", { ascending: true }),
      ]);
      if (!active) return;
      setTasks(sortTasks(taskRows || []));
      setEmployees((empRows || []).filter((e) => e.status !== "inactive"));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [customerId]);

  const openForm = () => {
    setSubject("");
    setAssigneeId(employee?.id || "");
    setDueDate(null);
    setNote("");
    setError("");
    setOpen(true);
  };

  const handleCreate = async (e) => {
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

      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert([
          {
            customer_id: customerId,
            subject: subject.trim(),
            assignee_id: assigneeId,
            created_by: employee?.id || null,
            due_date: due,
            note: note.trim() || null,
          },
        ])
        .select("*, assignee:assignee_id(full_name)")
        .single();
      if (insertError) throw insertError;

      setTasks((prev) => sortTasks([...prev, data]));

      // اعلان برای کاربر مسئول (اگر خودش نیست)؛ شکست اعلان مانع ثبت وظیفه نمی‌شود
      if (assigneeId !== employee?.id) {
        await supabase.from("notifications").insert([
          {
            employee_id: assigneeId,
            message: `📌 وظیفه جدید برای مشتری ${customerName}: ${subject.trim()}`,
          },
        ]);
      }
      setOpen(false);
    } catch (err) {
      setError(err.message || "ایجاد وظیفه ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task) => {
    const done = task.status !== "done";
    const patch = {
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    };
    const { error: err } = await supabase.from("tasks").update(patch).eq("id", task.id);
    if (!err) {
      setTasks((prev) =>
        sortTasks(prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)))
      );
    }
  };

  const removeTask = async (task) => {
    if (!window.confirm(`وظیفهٔ «${task.subject}» حذف شود؟`)) return;
    const { error: err } = await supabase.from("tasks").delete().eq("id", task.id);
    if (!err) setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  return (
    <>
      <div className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
          <h2 className="font-heading text-base font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            وظایف
          </h2>
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            ایجاد وظیفه
          </button>
        </div>

        <div className="px-4 py-3 max-h-96 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              هنوز وظیفه‌ای ثبت نشده.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((t) => {
                const done = t.status === "done";
                const overdue = !done && t.due_date && new Date(t.due_date) < new Date();
                const canDelete = isAdmin || t.created_by === employee?.id;
                return (
                  <li key={t.id} className="flex items-start gap-2.5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleDone(t)}
                      aria-label={done ? "بازگرداندن وظیفه" : "انجام شد"}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded-full border grid place-items-center shrink-0 transition-colors",
                        done
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-input hover:bg-accent"
                      )}
                    >
                      {done && <Check className="w-3 h-3" />}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        className={cn(
                          "text-sm font-medium break-words",
                          done && "line-through text-muted-foreground"
                        )}
                      >
                        {t.subject}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {t.assignee?.full_name || "—"}
                        </span>
                        {t.due_date && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              overdue && "text-destructive font-medium"
                            )}
                          >
                            <CalendarClock className="w-3 h-3" />
                            {formatJalali(new Date(t.due_date))}
                            {overdue && " (گذشته)"}
                          </span>
                        )}
                      </div>
                      {t.note && (
                        <p className="text-xs text-foreground/70 whitespace-pre-wrap break-words">
                          {t.note}
                        </p>
                      )}
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => removeTask(t)}
                        aria-label="حذف وظیفه"
                        className="w-7 h-7 rounded-md grid place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !saving && setOpen(false)}
          />
          <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-card rounded-[28px] border border-border shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h2 className="font-heading text-base font-semibold">ایجاد وظیفه</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent grid place-items-center text-muted-foreground"
                aria-label="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
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
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  انصراف
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "ایجاد"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
