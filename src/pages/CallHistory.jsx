import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Inbox,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  ANSWERED: { label: "پاسخ داده شد", cls: "bg-emerald-50 text-emerald-700" },
  answered: { label: "پاسخ داده شد", cls: "bg-emerald-50 text-emerald-700" },
  BUSY: { label: "مشغول", cls: "bg-destructive/10 text-destructive" },
  "NO ANSWER": { label: "بی‌پاسخ", cls: "bg-amber-50 text-amber-700" },
  CONGESTION: { label: "شلوغی خط", cls: "bg-destructive/10 text-destructive" },
  queued: { label: "در صف", cls: "bg-sky-50 text-sky-700" },
  routing: { label: "در حال مسیریابی", cls: "bg-sky-50 text-sky-700" },
  dialing: { label: "در حال تماس", cls: "bg-sky-50 text-sky-700" },
  requested: { label: "ثبت شده", cls: "bg-accent text-muted-foreground" },
  failed: { label: "ناموفق", cls: "bg-destructive/10 text-destructive" },
};

function interpretCall(row) {
  const p = row.raw_payload || {};
  if (p.direction === "outgoing_click_to_call") {
    return {
      kind: "outgoing",
      statusRaw: p.call_status,
      duration: null,
    };
  }
  return {
    kind: p.type || "incoming", // incoming | outgoing | local
    statusRaw: p.status,
    duration: p.time_talk,
  };
}

function formatDuration(sec) {
  const n = Number(sec);
  if (!n || Number.isNaN(n)) return "—";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

const KIND_ICON = {
  incoming: PhoneIncoming,
  outgoing: PhoneOutgoing,
  local: PhoneMissed,
};

export default function CallHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [customersById, setCustomersById] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200);

      if (!active) return;
      const list = error ? [] : data || [];
      setRows(list);

      const ids = [...new Set(list.map((r) => r.matched_customer_id).filter(Boolean))];
      if (ids.length) {
        const { data: customers } = await supabase
          .from("customers")
          .select("id, first_name, last_name")
          .in("id", ids);
        if (active && customers) {
          const map = {};
          customers.forEach((c) => {
            map[c.id] = `${c.first_name} ${c.last_name}`;
          });
          setCustomersById(map);
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
          تاریخچه تماس‌ها
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          لیست تماس‌های ورودی، خروجی و وضعیت هرکدام.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Inbox className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">هنوز تماسی ثبت نشده.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const { kind, statusRaw, duration } = interpretCall(row);
              const Icon = KIND_ICON[kind] || PhoneIncoming;
              const status = STATUS_LABELS[statusRaw] || {
                label: statusRaw || "نامشخص",
                cls: "bg-accent text-muted-foreground",
              };
              const customerName = row.matched_customer_id
                ? customersById[row.matched_customer_id]
                : null;

              return (
                <li
                  key={row.id}
                  onClick={() =>
                    row.matched_customer_id &&
                    navigate(`/customers/${row.matched_customer_id}`)
                  }
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5",
                    row.matched_customer_id && "cursor-pointer hover:bg-accent/40 transition-colors"
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-accent grid place-items-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      {customerName ? (
                        <>
                          <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {customerName}
                        </>
                      ) : (
                        row.phone || "شماره نامشخص"
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.phone} · {formatDate(row.received_at)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDuration(duration)}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full whitespace-nowrap",
                      status.cls
                    )}
                  >
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
