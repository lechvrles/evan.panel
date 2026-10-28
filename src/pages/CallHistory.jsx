import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Inbox,
  User as UserIcon,
  Headset,
  UserPlus,
  Play,
  StickyNote,
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

const KIND_ICON = { incoming: PhoneIncoming, outgoing: PhoneOutgoing, local: PhoneMissed };

const num = (v) => {
  if (v == null) return null;
  if (typeof v === "object") return v.number || v.num || null;
  return String(v);
};

function interpretCall(row) {
  const p = row.raw_payload || {};
  if (p.direction === "outgoing_click_to_call") {
    return { kind: "outgoing", statusRaw: p.call_status, duration: null, clickToCall: true };
  }
  return {
    kind: p.type || "incoming",
    statusRaw: p.status,
    duration: p.time_talk,
    clickToCall: false,
  };
}

// مبدا و مقصد را مشخص می‌کند و می‌گوید طرف مشتری کدام است
function getParties(row, kind, clickToCall, employeesById) {
  const p = row.raw_payload || {};
  const emp = row.employee_id ? employeesById[row.employee_id] : null;

  if (clickToCall) {
    return {
      source: emp?.extension || null,
      dest: row.phone || null,
      customerSide: "dest",
    };
  }
  if (kind === "incoming") {
    return {
      source: num(p.call_source) || row.phone || null,
      dest: num(p.call_dest),
      customerSide: "source",
    };
  }
  return {
    source: num(p.call_source),
    dest: num(p.call_dest) || row.phone || null,
    customerSide: kind === "outgoing" ? "dest" : null,
  };
}

function formatDuration(sec) {
  const n = Number(sec);
  if (!n || Number.isNaN(n)) return null;
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateTime(iso) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function PartyCell({ number, name, isOperator }) {
  if (!number && !name) return <span className="text-muted-foreground">—</span>;
  const Icon = isOperator ? Headset : UserIcon;
  return (
    <div className="min-w-0">
      {name && (
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {name}
        </p>
      )}
      {number && (
        <p className={cn("text-xs text-muted-foreground", name ? "mt-0.5" : "text-sm text-foreground")}>
          {number}
        </p>
      )}
    </div>
  );
}

function AudioCell({ row }) {
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [url, setUrl] = useState(null);
  const urlRef = useRef(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const hasAudio = row.call_id && row.file_id && row.file_id !== "0";
  if (!hasAudio) return <span className="text-xs text-muted-foreground">—</span>;

  const load = async () => {
    setState("loading");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const params = new URLSearchParams({
        cuid: row.call_id,
        record_id: row.file_id,
        quality: "merged",
      });
      const res = await fetch(`/api/call-recording?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      urlRef.current = objUrl;
      setUrl(objUrl);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  if (state === "ready") {
    return <audio controls autoPlay src={url} className="h-8 w-52" />;
  }

  return (
    <button
      type="button"
      onClick={load}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
    >
      {state === "loading" ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Play className="w-3.5 h-3.5" />
      )}
      {state === "error" ? "تلاش مجدد" : "پخش صوت"}
    </button>
  );
}

const COLUMNS = ["مبدا", "مقصد", "زمان", "وضعیت", "فایل صوتی / عملیات", "یادداشت"];

export default function CallHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [customersById, setCustomersById] = useState({});
  const [employeesById, setEmployeesById] = useState({});
  const [notesByCallId, setNotesByCallId] = useState({});
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

      const customerIds = [...new Set(list.map((r) => r.matched_customer_id).filter(Boolean))];
      const employeeIds = [...new Set(list.map((r) => r.employee_id).filter(Boolean))];
      const callIds = [...new Set(list.map((r) => r.call_id).filter(Boolean))];

      const [customersRes, employeesRes, notesRes] = await Promise.all([
        customerIds.length
          ? supabase.from("customers").select("id, first_name, last_name").in("id", customerIds)
          : Promise.resolve({ data: [] }),
        employeeIds.length
          ? supabase.from("employees").select("id, full_name, extension").in("id", employeeIds)
          : Promise.resolve({ data: [] }),
        callIds.length
          ? supabase.from("call_reports").select("call_id, subject, report").in("call_id", callIds)
          : Promise.resolve({ data: [] }),
      ]);

      if (!active) return;

      const cMap = {};
      (customersRes.data || []).forEach((c) => {
        cMap[c.id] = `${c.first_name} ${c.last_name}`;
      });
      setCustomersById(cMap);

      const eMap = {};
      (employeesRes.data || []).forEach((e) => {
        eMap[e.id] = { name: e.full_name || "اپراتور", extension: e.extension };
      });
      setEmployeesById(eMap);

      const nMap = {};
      (notesRes.data || []).forEach((n) => {
        const text = [n.subject, n.report].filter(Boolean).join(" — ");
        if (!text) return;
        nMap[n.call_id] = nMap[n.call_id] ? `${nMap[n.call_id]}\n${text}` : text;
      });
      setNotesByCallId(nMap);

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const goToRegisterWithPhone = (e, phone) => {
    e.stopPropagation();
    navigate("/customers/register", { state: { phone } });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-right text-xs text-muted-foreground bg-accent/30">
                  {COLUMNS.map((col) => (
                    <th key={col} className="font-medium px-4 py-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { kind, statusRaw, duration, clickToCall } = interpretCall(row);
                  const Icon = KIND_ICON[kind] || PhoneIncoming;
                  const status = STATUS_LABELS[statusRaw] || {
                    label: statusRaw || "نامشخص",
                    cls: "bg-accent text-muted-foreground",
                  };
                  const parties = getParties(row, kind, clickToCall, employeesById);
                  const customerName = row.matched_customer_id
                    ? customersById[row.matched_customer_id]
                    : null;
                  const operatorName = row.employee_id ? employeesById[row.employee_id]?.name : null;

                  const customerNumber =
                    parties.customerSide === "source"
                      ? parties.source
                      : parties.customerSide === "dest"
                      ? parties.dest
                      : row.phone;

                  const sourceIsCustomer = parties.customerSide === "source";
                  const destIsCustomer = parties.customerSide === "dest";

                  const note = row.call_id ? notesByCallId[row.call_id] : null;
                  const dur = formatDuration(duration);

                  return (
                    <tr
                      key={row.id}
                      onClick={() =>
                        row.matched_customer_id && navigate(`/customers/${row.matched_customer_id}`)
                      }
                      className={cn(
                        "border-t border-border align-middle",
                        row.matched_customer_id && "cursor-pointer hover:bg-accent/40 transition-colors"
                      )}
                    >
                      {/* مبدا */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent grid place-items-center shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <PartyCell
                            number={parties.source}
                            name={sourceIsCustomer ? customerName : destIsCustomer ? operatorName : null}
                            isOperator={!sourceIsCustomer}
                          />
                        </div>
                      </td>

                      {/* مقصد */}
                      <td className="px-4 py-3">
                        <PartyCell
                          number={parties.dest}
                          name={destIsCustomer ? customerName : sourceIsCustomer ? operatorName : null}
                          isOperator={!destIsCustomer}
                        />
                      </td>

                      {/* زمان */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm">{formatDateTime(row.received_at)}</p>
                        {dur && <p className="text-xs text-muted-foreground mt-0.5">مدت: {dur}</p>}
                      </td>

                      {/* وضعیت */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block",
                            status.cls
                          )}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* پخش صوت / افزودن مشتری */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <AudioCell row={row} />
                          {!row.matched_customer_id && customerNumber && (
                            <button
                              type="button"
                              onClick={(e) => goToRegisterWithPhone(e, customerNumber)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-accent active:scale-95 transition-all whitespace-nowrap"
                              title="افزودن به‌عنوان مشتری جدید"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              افزودن مشتری
                            </button>
                          )}
                        </div>
                      </td>

                      {/* یادداشت */}
                      <td className="px-4 py-3 max-w-[240px]">
                        {note ? (
                          <p
                            className="text-xs text-foreground/80 line-clamp-2 whitespace-pre-wrap flex gap-1.5"
                            title={note}
                          >
                            <StickyNote className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{note}</span>
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}