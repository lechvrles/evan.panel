import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, Send, LogIn, Megaphone } from "lucide-react";

const formatDate = (iso) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );

export default function Notifications() {
  const { employee } = useAuth();
  const { refresh } = useNotifications();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [broadcastText, setBroadcastText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    setSending(true);
    setError("");
    try {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert([{ employee_id: null, message: broadcastText.trim() }]);
      if (insertError) throw insertError;
      setBroadcastText("");
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

      {employee?.role === "admin" && (
        <form
          onSubmit={handleBroadcast}
          className="rounded-2xl border border-border bg-card p-5 space-y-3"
        >
          <Label>ارسال اعلان به همه کارمندان</Label>
          <textarea
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="متن اعلان…"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
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
                  {n.employee_id ? (
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
