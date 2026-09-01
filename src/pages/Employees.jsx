import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { ROLE_OPTIONS, POSITION_SUGGESTIONS } from "@/lib/roles";
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
import {
  Loader2,
  UserPlus,
  KeyRound,
  Trash2,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

async function authedFetch(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "خطای ناشناخته");
  return json;
}

export default function Employees() {
  const { employee: current } = useAuth();
  const [employees, setEmployees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    position: "",
    role: "employee",
  });
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetValue, setResetValue] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadEmployees = async () => {
    const { data, error: fetchError } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: true });
    setEmployees(fetchError ? [] : data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  if (current && current.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await authedFetch("/api/create-employee", form);
      setForm({ username: "", password: "", full_name: "", position: "", role: "employee" });
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleOrStatusChange = async (id, patch) => {
    setError("");
    const { error: updateError } = await supabase
      .from("employees")
      .update(patch)
      .eq("id", id);
    if (updateError) setError(updateError.message);
    else await loadEmployees();
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setResetting(true);
    try {
      await authedFetch("/api/reset-employee-password", {
        employeeId: resetTarget.id,
        newPassword: resetValue,
      });
      setResetTarget(null);
      setResetValue("");
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`کارمند «${emp.full_name || emp.username}» حذف شود؟`)) return;
    setError("");
    try {
      await authedFetch("/api/delete-employee", { employeeId: emp.id });
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
          مدیریت کارمندان
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          افزودن، ویرایش نقش و بازنشانی رمز عبور کارمندان.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          <h2 className="font-medium text-sm">افزودن کارمند جدید</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>نام و نام خانوادگی</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>نام کاربری</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="مثلاً: ali.rezaei"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>رمز عبور</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="حداقل ۶ کاراکتر"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>سمت شغلی (اختیاری)</Label>
            <Input
              list="position-suggestions"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              placeholder="مثلاً: توسعه‌دهنده، مدیر کل بازرگانی…"
            />
            <datalist id="position-suggestions">
              {POSITION_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>نقش</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                در حال ساخت…
              </>
            ) : (
              "افزودن کارمند"
            )}
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-medium text-sm">کارمندان فعلی</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {employees.map((emp) => (
              <li key={emp.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-accent grid place-items-center shrink-0">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {emp.full_name || "—"}
                    {emp.id === current?.id && (
                      <span className="text-xs text-muted-foreground"> (شما)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{emp.username}</p>
                  <Input
                    defaultValue={emp.position || ""}
                    placeholder="سمت شغلی…"
                    list="position-suggestions"
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value !== (emp.position || "")) {
                        handleRoleOrStatusChange(emp.id, { position: value });
                      }
                    }}
                    className="h-7 mt-1 text-xs px-2 max-w-[160px]"
                  />
                </div>

                <Select
                  value={emp.role}
                  onValueChange={(v) => handleRoleOrStatusChange(emp.id, { role: v })}
                  disabled={emp.id === current?.id}
                >
                  <SelectTrigger className="w-28 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={emp.status}
                  onValueChange={(v) => handleRoleOrStatusChange(emp.id, { status: v })}
                  disabled={emp.id === current?.id}
                >
                  <SelectTrigger className="w-24 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="inactive">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(emp);
                    setResetValue("");
                  }}
                  className="w-9 h-9 rounded-lg grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="بازنشانی رمز عبور"
                  title="بازنشانی رمز عبور"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                {emp.id !== current?.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(emp)}
                    className="w-9 h-9 rounded-lg grid place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="حذف کارمند"
                    title="حذف کارمند"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <form
            onSubmit={handleResetPassword}
            className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">
                بازنشانی رمز عبور «{resetTarget.full_name || resetTarget.username}»
              </h3>
            </div>
            <div className="space-y-1.5">
              <Label>رمز عبور جدید</Label>
              <Input
                type="password"
                value={resetValue}
                onChange={(e) => setResetValue(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                autoFocus
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="destructive" onClick={() => setResetTarget(null)}>
                انصراف
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "ذخیره رمز جدید"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
