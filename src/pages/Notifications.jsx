import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Loader2, Send, LogIn, Megaphone, ChevronDown, Users } from "lucide-react";

const formatDate = (iso) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );

const nameOf = (e) => e.full_name || "بدون نام";

export default function Notifications() {
  const { employee } = useAuth();
  const { refresh } = useNotifications();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  const [broadcastText, setBroadcastText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = employee?.role === "admin";

  const load = async () => {
    const { data, error: fetchError } = await supabase.rpc("list_my_notifications");
    setItems(fetchError ? [] : data || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
      await supabase.rpc("mark_all_notifications_read");
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لیست اپراتورها فقط برای ادمین لازمه
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, position, status")
        .order("full_name", { ascending: true });
      setEmployees((data || []).filter((e) => e.status !== "inactive"));
    })();
  }, [isAdmin]);

  const toggleAll = (checked) => {
    setSendToAll(!!checked);
    setSelectedIds([]);
  };

  const toggleOne = (id, checked) => {
    const next = checked
      ? [...new Set([...selectedIds, id])]
      : selectedIds.filter((x) => x !== id);

    // اگه همه‌ی اپراتورها تیک خوردن، یعنی «همه»
    if (employees.length > 0 && next.length === employees.length) {
      setSendToAll(true);
      setSelectedIds([]);
      return;
    }
    setSendToAll(false);
    setSelectedIds(next);
  };

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id));
  const summary = sendToAll
    ? "همه"
    : selectedEmployees.length === 0
    ? "انتخاب گیرندگان…"
    : selectedEmployees.length <= 2
    ? selectedEmployees.map(nameOf).join("، ")
    : `${selectedEmployees.length.toLocaleString("fa-IR")} اپراتور انتخاب شده`;

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!broadcastText.trim()) return;
    if (!sendToAll && selectedIds.length === 0) {
      setError("حداقل یک گیرنده انتخاب کنید");
      return;
    }

    setSending(true);
    try {
      const message = broadcastText.trim();
      // «همه» = یک ردیف با employee_id خالی؛ در غیر این‌صورت یک ردیف برای هر گیرنده
      const rows = sendToAll
        ? [{ employee_id: null, message }]
        : selectedIds.map((id) => ({ employee_id: id, message }));

      const { error: insertError } = await supabase.from("notifications").insert(rows);
      if (insertError) throw insertError;

      setBroadcastText("");
      setSuccess(
        sendToAll
          ? "اعلان برای همه ارسال شد."
          : `اعلان برای ${selectedIds.length.toLocaleString("fa-IR")} نفر ارسال شد.`
      );
      setTimeout(() => setSuccess(""), 3000);
      await load();
    } catch (err) {
      setError(err.message || "ارسال اعلان ناموفق بود");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
          اعلان‌ها
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          پیام‌های ورود به سامانه و اطلاعیه‌های مدیریت.
        </p>
      </div>

      {isAdmin && (
        <>
          {/* کادر انتخاب گیرندگان */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              گیرندگان اعلان
            </Label>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span className="truncate">{summary}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                dir="rtl"
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-1.5 max-h-72 overflow-y-auto"
              >
                <label className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium cursor-pointer hover:bg-accent">
                  <Checkbox checked={sendToAll} onCheckedChange={toggleAll} />
                  همه
                </label>
                <div className="my-1 h-px bg-border" />
                {employees.length === 0 ? (
                  <p className="px-2.5 py-3 text-xs text-muted-foreground">
                    اپراتوری یافت نشد.
                  </p>
                ) : (
                  employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={sendToAll || selectedIds.includes(emp.id)}
                        disabled={sendToAll}
                        onCheckedChange={(c) => toggleOne(emp.id, c)}
                      />
                      <span className="truncate">{nameOf(emp)}</span>
                      {emp.position && (
                        <span className="text-xs text-muted-foreground truncate">
                          {emp.position}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* کادر متن پیام */}
          <form
            onSubmit={handleSend}
            className="rounded-2xl border border-border bg-card p-5 space-y-3"
          >
            <Label>متن اعلان</Label>
            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="متن اعلان…"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-emerald-700">{success}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    ارسال
                  </>
                )}
              </Button>
            </div>
          </form>
        </>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">اعلانی وجود ندارد.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className="flex items-start gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-full bg-accent grid place-items-center shrink-0 mt-0.5">
                  {n.message?.startsWith("ورود به سامانه") ? (
                    <LogIn className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Megaphone className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(n.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
