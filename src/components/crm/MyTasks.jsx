import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, CalendarClock, ChevronLeft, ClipboardList, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { formatJalali } from "./JalaliDatePicker";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "open", label: "باز" },
  { id: "done", label: "انجام‌شده" },
];

const sortTasks = (list) =>
  [...list].sort((a, b) => {
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (da !== db) return da - db;
    return new Date(b.created_at) - new Date(a.created_at);
  });

export default function MyTasks() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

  useEffect(() => {
    if (!employee?.id) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, customers(id, first_name, last_name), creator:created_by(full_name)")
        .eq("assignee_id", employee.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      setTasks(error ? [] : data || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [employee?.id]);

  const toggleDone = async (task) => {
    const done = task.status !== "done";
    const patch = {
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    }
  };

  const openCount = tasks.filter((t) => t.status !== "done").length;
  const visible = sortTasks(
    tasks.filter((t) => (filter === "done" ? t.status === "done" : t.status !== "done"))
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading text-base font-semibold">وظایف من</h2>
          {!loading && openCount > 0 && (
            <span className="rounded-full bg-primary text-primary-foreground text-[11px] px-2 py-0.5">
              {openCount.toLocaleString("fa-IR")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-accent/60 rounded-full p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3.5 h-8 rounded-full text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <ClipboardList className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">
              {filter === "open" ? "وظیفهٔ بازی ندارید." : "هنوز وظیفه‌ای انجام نشده."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((t) => {
              const done = t.status === "done";
              const overdue = !done && t.due_date && new Date(t.due_date) < new Date();
              const customer = t.customers;
              const customerName = customer
                ? `${customer.first_name} ${customer.last_name}`
                : "مشتری حذف‌شده";
              return (
                <li
                  key={t.id}
                  onClick={() => customer && navigate(`/customers/${customer.id}`)}
                  className={cn(
                    "flex items-start gap-3 px-3 py-3 rounded-xl transition-colors",
                    customer && "cursor-pointer hover:bg-accent/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDone(t);
                    }}
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
                        {customerName}
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
                      {t.creator?.full_name && t.created_by !== employee?.id && (
                        <span>از طرف {t.creator.full_name}</span>
                      )}
                    </div>
                    {t.note && (
                      <p className="text-xs text-foreground/70 whitespace-pre-wrap break-words">
                        {t.note}
                      </p>
                    )}
                  </div>

                  {customer && (
                    <ChevronLeft className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
