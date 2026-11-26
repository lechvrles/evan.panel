import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, CalendarCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import JalaliDatePicker, { formatJalali } from "./JalaliDatePicker";
import { cn } from "@/lib/utils";

const TARGETS = [
  { id: "customer", label: "مشتری" },
  { id: "project", label: "پروژه" },
];

export default function VisitCreatePanel({
  open,
  onClose,
  onSaved,
  customerId,
  customerName,
  projectName,
}) {
  const { employee } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [targetType, setTargetType] = useState("customer");
  const [targetCustomerId, setTargetCustomerId] = useState(customerId);
  const [project, setProject] = useState("");
  const [visitDate, setVisitDate] = useState(null);
  const [timeStr, setTimeStr] = useState("10:00");
  const [assigneeId, setAssigneeId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTargetType("customer");
    setTargetCustomerId(customerId);
    setProject(projectName || "");
    setVisitDate(null);
    setTimeStr("10:00");
    setAssigneeId(employee?.id || "");
    setNote("");
    setError("");

    let active = true;
    (async () => {
      const [{ data: emps }, { data: custs }] = await Promise.all([
        supabase
          .from("employees")
          .select("id, full_name, position, status")
          .order("full_name", { ascending: true }),
        supabase
          .from("customers")
          .select("id, first_name, last_name, project_name, project_location")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (!active) return;
      setEmployees((emps || []).filter((e) => e.status !== "inactive"));
      setCustomers(custs || []);
    })();
    return () => {
      active = false;
    };
  }, [open, customerId, projectName, employee?.id]);

  // پروژه‌های یکتا از روی جدول مشتری‌ها
  const projects = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => {
      const name = (c.project_name || "").trim();
      if (name && !map.has(name)) map.set(name, c.project_location || "");
    });
    return [...map.entries()].map(([name, location]) => ({ name, location }));
  }, [customers]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (targetType === "customer" && !targetCustomerId) {
      return setError("مشتری را انتخاب کنید");
    }
    if (targetType === "project" && !project) {
      return setError("پروژه را انتخاب کنید");
    }
    if (!visitDate) return setError("تاریخ بازدید را انتخاب کنید");
    if (!timeStr) return setError("ساعت بازدید را وارد کنید");
    if (!assigneeId) return setError("کارشناس را انتخاب کنید");

    const [h, m] = timeStr.split(":").map(Number);
    const when = new Date(visitDate);
    when.setHours(h || 0, m || 0, 0, 0);

    setSaving(true);
    try {
      const selectedProject = projects.find((p) => p.name === project);
      const { error: insertError } = await supabase.from("visits").insert([
        {
          // در حالت پروژه، قرار روی تایم‌لاین همین مشتری ثبت می‌شود
          customer_id: targetType === "customer" ? targetCustomerId : customerId,
          target_type: targetType,
          project_name: targetType === "project" ? project : null,
          project_location: targetType === "project" ? selectedProject?.location || null : null,
          visit_at: when.toISOString(),
          assignee_id: assigneeId,
          created_by: employee?.id || null,
          note: note.trim() || null,
        },
      ]);
      if (insertError) throw insertError;

      if (assigneeId !== employee?.id) {
        const label =
          targetType === "project"
            ? `پروژه ${project}`
            : `مشتری ${
                customers.find((c) => c.id === targetCustomerId)
                  ? `${customers.find((c) => c.id === targetCustomerId).first_name} ${
                      customers.find((c) => c.id === targetCustomerId).last_name
                    }`
                  : customerName
              }`;
        await supabase.from("notifications").insert([
          {
            employee_id: assigneeId,
            message: `📅 قرار بازدید ${label} — ${formatJalali(when)} ساعت ${timeStr}`,
          },
        ]);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "ثبت قرار بازدید ناموفق بود");
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
            <CalendarCheck className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">قرار بازدید</h2>
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
          {/* مشتری یا پروژه */}
          <div className="space-y-1.5">
            <Label>مربوط به</Label>
            <div className="flex items-center gap-1 bg-accent/60 rounded-full p-1 w-fit">
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetType(t.id)}
                  className={cn(
                    "px-4 h-8 rounded-full text-xs font-medium transition-colors",
                    targetType === t.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {targetType === "customer" ? (
              <Select value={targetCustomerId} onValueChange={setTargetCustomerId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="مشتری را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="پروژه را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      پروژه‌ای ثبت نشده است.
                    </p>
                  )}
                  {projects.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                      {p.location ? ` — ${p.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* تاریخ و ساعت */}
          <div className="space-y-1.5">
            <Label>تاریخ بازدید</Label>
            <JalaliDatePicker value={visitDate} onChange={setVisitDate} />
          </div>

          <div className="space-y-1.5">
            <Label>ساعت بازدید</Label>
            <Input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="h-11 text-center font-mono tracking-wide rounded-xl bg-card [color-scheme:light]"
            />
          </div>

          {/* کارشناس */}
          <div className="space-y-1.5">
            <Label>کارشناس</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="کارشناس را انتخاب کنید" />
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

          {/* یادداشت */}
          <div className="space-y-1.5">
            <Label>یادداشت</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="توضیحات بازدید، آدرس دقیق، هماهنگی‌ها…"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="destructive" onClick={onClose} disabled={saving}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "ثبت قرار"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
