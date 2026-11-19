import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomerAccess({ customerId, ownerId, value = [], onChange }) {
  const { employee } = useAuth();
  const live = !!customerId;
  const [people, setPeople] = useState([]);
  const [granted, setGranted] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: emps }, access] = await Promise.all([
        supabase
          .from("employees")
          .select("id, full_name, position, role, status")
          .order("full_name", { ascending: true }),
        live
          ? supabase.from("customer_access").select("employee_id").eq("customer_id", customerId)
          : Promise.resolve({ data: [] }),
      ]);
      if (!active) return;
      const owner = ownerId || employee?.id;
      // ادمین‌ها خودشان همه‌چیز را می‌بینند و ثبت‌کننده هم همیشه دسترسی دارد
      setPeople(
        (emps || []).filter((e) => e.status !== "inactive" && e.role !== "admin" && e.id !== owner)
      );
      setGranted(new Set((access.data || []).map((a) => a.employee_id)));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [customerId, ownerId, employee?.id, live]);

  const selected = live ? granted : new Set(value);

  const toggle = async (id) => {
    const has = selected.has(id);
    if (!live) {
      onChange?.(has ? value.filter((x) => x !== id) : [...value, id]);
      return;
    }
    setBusyId(id);
    setError("");
    const { error: err } = has
      ? await supabase.from("customer_access").delete().eq("customer_id", customerId).eq("employee_id", id)
      : await supabase.from("customer_access").insert([{ customer_id: customerId, employee_id: id }]);
    setBusyId(null);
    if (err) return setError(err.message || "تغییر دسترسی ناموفق بود");
    setGranted((prev) => {
      const next = new Set(prev);
      has ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        ادمین‌ها و ثبت‌کننده‌ی مشتری همیشه دسترسی دارند. بقیه فقط در صورت انتخاب در این لیست.
      </p>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : people.length === 0 ? (
        <p className="text-xs text-muted-foreground">کارمند دیگری برای افزودن وجود ندارد.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto scrollbar-thin rounded-xl border border-border divide-y divide-border">
          {people.map((p) => (
            <label key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent/50">
              <Checkbox checked={selected.has(p.id)} disabled={busyId === p.id} onCheckedChange={() => toggle(p.id)} />
              <span className="truncate">{p.full_name || "بدون نام"}</span>
              {p.position && <span className="text-xs text-muted-foreground truncate">{p.position}</span>}
              {busyId === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-auto" />}
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function AccessSectionHeader() {
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-4 h-4 text-primary" />
      <h2 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">دسترسی کارمندان</h2>
    </div>
  );
}
