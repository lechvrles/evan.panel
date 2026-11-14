import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  Loader2,
  MessageSquare,
  ClipboardEdit,
  PhoneCall,
  Paperclip,
  Send,
  FileText,
  X,
  Filter,
  Check,
  PhoneIncoming,
  PhoneOutgoing,
  ListTodo,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatJalali } from "./JalaliDatePicker";

const aKey = (r) => `${r._kind}-${r.id}`; // جلوگیری از تداخل id گزارش و لاگ

function formatTalk(sec) {
  const n = Number(sec);
  if (!n || Number.isNaN(n)) return null;
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
}

function CallLogBubble({ item, audioUrl, audioLoading }) {
  const p = item.raw_payload || {};
  const incoming = p.type === "incoming";
  const Icon = incoming ? PhoneIncoming : PhoneOutgoing;
  const talk = formatTalk(p.time_talk);
  return (
    <div className="max-w-[85%] mr-auto rounded-2xl rounded-tr-sm bg-sky-50/90 border border-sky-200/70 px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-sky-900 mb-2 border-b border-sky-200/50 pb-1.5">
        <span className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-sky-700" />
          {incoming ? "تماس ورودی" : "تماس خروجی"}
        </span>
        <span className="text-sky-800/80 font-normal">{formatTime(item.created_at)}</span>
      </div>
      {talk && <p className="text-xs text-sky-800/80 mb-2">مدت: {talk}</p>}
      {audioUrl ? (
        <audio controls className="w-full h-9 rounded-lg">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
      ) : audioLoading ? (
        <div className="flex items-center gap-2 text-xs text-sky-800/70">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          در حال دریافت فایل صوتی…
        </div>
      ) : null}
    </div>
  );
}

const ACCEPTED_FILES =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv";
const MAX_FILE_MB = 15;

const TYPE_FILTERS = [
  { id: "all", label: "همه" },
  { id: "reports", label: "گزارش تماس" },
  { id: "tasks", label: "وظایف" },
  { id: "files", label: "فایل‌ها" },
];

// رنگ ثابت برای هر «سمت»، تا همیشه یک رنگ ثابت به همون سمت اختصاص پیدا کنه
const NAME_COLORS = [
  "text-rose-600",
  "text-blue-600",
  "text-emerald-600",
  "text-amber-600",
  "text-purple-600",
  "text-cyan-600",
  "text-pink-600",
  "text-indigo-600",
];
function colorForLabel(label) {
  const str = label || "کارمند";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

function formatDuration(start, end) {
  if (!start || !end) return null;

  // Convert Unix timestamps to milliseconds if needed
  const startTime = typeof start === 'number' ? start * 1000 : new Date(start).getTime();
  const endTime = typeof end === 'number' ? end * 1000 : new Date(end).getTime();

  const d = Math.max(0, endTime - startTime);
  const m = Math.floor(d / 60000); // 60 * 1000 milliseconds in a minute
  const s = Math.floor((d % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
  }).format(new Date(iso));
}

function formatTime(iso) {
  return new Intl.DateTimeFormat("fa-IR", {
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function CallTimeline({ customerId, customerName, refreshKey, onAddReport, onAddTask }) {
  const { employee } = useAuth();
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesRefresh, setMessagesRefresh] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("all");

  const [audioUrls, setAudioUrls] = useState({});
  const [audioLoading, setAudioLoading] = useState({});
  const [fileUrls, setFileUrls] = useState({});

  const [messageText, setMessageText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);
  const contentRef = useRef(null);
  const followLatestRef = useRef(true);
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setFeed(null);
    setTypeFilter("all");
    setPersonFilter("all");
    setReplyTo(null);
    setEditingId(null);
    followLatestRef.current = true;
  }, [customerId]);

  useLayoutEffect(() => {
    if (!loading && followLatestRef.current && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [feed, loading, typeFilter, personFilter]);

  // بارگذاری دیرهنگام عکس و صوت نباید آخرین پیام را از دید خارج کند.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (followLatestRef.current && messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    });
    if (contentRef.current) observer.observe(contentRef.current);
    if (messagesRef.current) observer.observe(messagesRef.current);
    return () => observer.disconnect();
  }, []);

  // بارگذاری ترکیبی گزارش‌های تماس و پیام‌ها، مرتب‌شده بر اساس زمان
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const [reportsRes, messagesRes, callsRes, tasksRes] = await Promise.all([
        supabase
          .from("call_reports")
          .select("*, employees(full_name, position)")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: true }),
        supabase
          .from("customer_messages")
          .select("*, employees(full_name, position)")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: true }),
        supabase
          .from("call_logs")
          .select("*")
          .eq("matched_customer_id", customerId)
          .order("received_at", { ascending: true }),
        supabase
          .from("tasks")
          .select("*, creator:created_by(full_name, position), assignee:assignee_id(full_name)")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: true }),
      ]);
      if (!active) return;
      const reports = reportsRes.error ? [] : reportsRes.data || [];
      const reportCallIds = new Set(reports.map((r) => r.call_id).filter(Boolean));

      const merged = [
        ...reports.map((r) => ({ ...r, _kind: "report" })),
        ...(messagesRes.error ? [] : (messagesRes.data || []).map((m) => ({ ...m, _kind: "message" }))),
        ...(tasksRes.error
            ? []
            : (tasksRes.data || []).map((t) => ({
                ...t,
                _kind: "task",
                employee_id: t.created_by,
                employees: t.creator,
              }))),
        ...(callsRes.error ? [] : (callsRes.data || [])
          .filter((l) => !reportCallIds.has(l.call_id))
          .map((l) => ({ ...l, _kind: "call", created_at: l.received_at }))),
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      setFeed(merged);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [customerId, refreshKey, messagesRefresh]);

  // پخش صوت تماس‌ها
  useEffect(() => {
    if (!feed?.length) return;
    const withCall = feed.filter(
      (r) => (r._kind === "report" || r._kind === "call") &&
             r.call_id && r.file_id && r.file_id !== "0" && !audioUrls[aKey(r)]
    );
    if (!withCall.length) return;

    let createdUrls = [];
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      for (const r of withCall) {
        setAudioLoading((prev) => ({ ...prev, [aKey(r)]: true }));
        try {
          const params = new URLSearchParams({
            cuid: r.call_id,
            record_id: r.file_id,
            quality: "merged",
          });
          const res = await fetch(`/api/call-recording?${params.toString()}`, {
            headers: { Authorization: `Bearer ${session?.access_token}` },
          });
          if (!res.ok || cancelled) {
            setAudioLoading((prev) => ({ ...prev, [r]: false }));
            continue;
          }
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          createdUrls.push(objUrl);
          if (!cancelled) setAudioUrls((prev) => ({ ...prev, [aKey(r)]: objUrl }));
        } catch {
        } finally {
          setAudioLoading((prev) => ({ ...prev, [r.id]: false }));
        }
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  // لینک امن برای فایل‌های ضمیمه‌ی پیام‌ها
  useEffect(() => {
    if (!feed?.length) return;
    const withFile = feed.filter(
      (m) => m._kind === "message" && m.file_path && !fileUrls[m.id]
    );
    if (!withFile.length) return;

    (async () => {
      const entries = await Promise.all(
        withFile.map(async (m) => {
          const { data } = await supabase.storage
            .from("customer-files")
            .createSignedUrl(m.file_path, 3600);
          return [m.id, data?.signedUrl || null];
        })
      );
      setFileUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [feed]);

  const isEmpty = !loading && feed?.length === 0;

  // ---- فیلتر محتوای چت ----
  const filterActive = typeFilter !== "all" || personFilter !== "all";

  const peopleMap = {};
  (feed || []).forEach((item) => {
    if (item.employee_id) peopleMap[item.employee_id] = item.employees?.full_name || "کارمند";
  });
  const people = Object.entries(peopleMap).map(([id, name]) => ({ id, name }));

  const visibleFeed = (feed || []).filter((item) => {
    if (personFilter !== "all" && item.employee_id !== personFilter) return false;
    if (typeFilter === "reports") return item._kind === "report";
    if (typeFilter === "tasks") return item._kind === "task";
    if (typeFilter === "files") return item._kind === "message" && !!item.file_path;
    return true;
  });
  const noMatches = !loading && !isEmpty && (feed?.length ?? 0) > 0 && visibleFeed.length === 0;

  const applyTypeFilter = (value) => {
    followLatestRef.current = true;
    setTypeFilter(value);
  };
  const applyPersonFilter = (value) => {
    followLatestRef.current = true;
    setPersonFilter(value);
  };
  const clearFilters = () => {
    followLatestRef.current = true;
    setTypeFilter("all");
    setPersonFilter("all");
  };

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setSendError(`حجم فایل نباید بیشتر از ${MAX_FILE_MB} مگابایت باشد`);
      e.target.value = "";
      return;
    }
    setSendError("");
    setPendingFile(file);
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !pendingFile) return;
    setSending(true);
    setSendError("");
    try {
      let file_path = null;
      let file_name = null;
      let file_type = null;

      if (pendingFile) {
        const ext = pendingFile.name.includes(".") ? pendingFile.name.split(".").pop() : "";
        const path = `${customerId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}${ext ? "." + ext : ""}`;
        const { error: uploadError } = await supabase.storage
          .from("customer-files")
          .upload(path, pendingFile, { contentType: pendingFile.type });
        if (uploadError) throw uploadError;
        file_path = path;
        file_name = pendingFile.name;
        file_type = pendingFile.type;
      }

      const { error: insertError } = await supabase.from("customer_messages").insert([
        {
          customer_id: customerId,
          employee_id: employee?.id || null,
          reply_to_id: replyTo?.id || null,
          message: messageText.trim(),
          file_path,
          file_name,
          file_type,
        },
      ]);
      if (insertError) throw insertError;

      setMessageText("");
      setReplyTo(null);
      clearPendingFile();
      followLatestRef.current = true;
      setMessagesRefresh((k) => k + 1);
    } catch (err) {
      setSendError(err.message || "ارسال پیام ناموفق بود");
    } finally {
      setSending(false);
    }
  };

  const toggleTask = async (task) => {
    const done = task.status !== "done";
    const patch = {
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    };
    const { error: err } = await supabase.from("tasks").update(patch).eq("id", task.id);
    if (!err) {
      setFeed((prev) =>
        prev.map((i) => (i._kind === "task" && i.id === task.id ? { ...i, ...patch } : i))
      );
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`وظیفهٔ «${task.subject}» حذف شود؟`)) return;
    const { error: err } = await supabase.from("tasks").delete().eq("id", task.id);
    if (!err) setFeed((prev) => prev.filter((i) => !(i._kind === "task" && i.id === task.id)));
  };

  const startReply = (m) => {
    setEditingId(null);
    setReplyTo(m);
    inputRef.current?.focus();
  };
  const startEdit = (m) => {
    setReplyTo(null);
    setEditingId(m.id);
    setEditText(m.message || "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };
  const saveEdit = async (m) => {
    const text = editText.trim();
    if (!text && !m.file_path) return;
    if (text === (m.message || "")) return cancelEdit();
    setSavingEdit(true);
    const patch = { message: text, edited_at: new Date().toISOString() };
    const { error: err } = await supabase
      .from("customer_messages")
      .update(patch)
      .eq("id", m.id);
    setSavingEdit(false);
    if (err) {
      setSendError(err.message || "ویرایش پیام ناموفق بود");
      return;
    }
    setFeed((prev) =>
      prev.map((i) => (i._kind === "message" && i.id === m.id ? { ...i, ...patch } : i))
    );
    cancelEdit();
  };
  const jumpTo = (id) => {
    followLatestRef.current = false;
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="rounded-[28px] bg-card border border-border shadow-sm flex flex-col h-[70dvh] lg:h-[calc(100dvh-12rem)] min-h-[20rem] min-w-0 overflow-hidden">
    <div className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between gap-3">
      <h2 className="font-heading text-base font-semibold truncate">{customerName}</h2>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "shrink-0 inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
              filterActive
                ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
                : "border-border hover:bg-accent"
            )}
            aria-label="فیلتر محتوای چت"
            title="فیلتر محتوای چت"
          >
            <Filter className="w-3.5 h-3.5" />
            فیلتر
          </button>
        </PopoverTrigger>
        <PopoverContent dir="rtl" align="start" className="w-64 space-y-4 p-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold">نوع محتوا</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTypeFilter(t.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    typeFilter === t.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent/60 hover:bg-accent"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold">شخص</p>
            <div className="max-h-44 space-y-0.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => applyPersonFilter("all")}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs hover:bg-accent"
              >
                همه افراد
                {personFilter === "all" && <Check className="w-3.5 h-3.5" />}
              </button>
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => applyPersonFilter(person.id)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs hover:bg-accent"
                >
                  <span className="truncate">{person.name}</span>
                  {personFilter === person.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {filterActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-md border border-border py-1.5 text-xs hover:bg-accent"
            >
              پاک کردن فیلتر
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>

      <div
        ref={messagesRef}
        role="region"
        aria-label="پیام‌ها و گزارش‌های مشتری"
        aria-busy={loading}
        tabIndex={0}
        onScroll={() => {
          const node = messagesRef.current;
          followLatestRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin px-3 sm:px-6 py-5"
      >
        <div
          ref={contentRef}
        className={cn(
          "flex flex-col min-h-full",
          (isEmpty || noMatches) ? "items-center justify-center" : "space-y-4"        )}
      >
        {loading && !feed ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : noMatches ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <Filter className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">موردی با این فیلتر پیدا نشد.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-xs text-primary hover:underline"
            >
              پاک کردن فیلتر
            </button>
          </div>
        ) : isEmpty ? (          <div className="flex flex-col items-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">هنوز پیام یا گزارشی ثبت نشده.</p>
          </div>
        ) : (
          visibleFeed.map((item, index) => (
            <React.Fragment key={`${item._kind}-${item.id}`}>
              {(index === 0 || formatDate(item.created_at) !== formatDate(visibleFeed[index - 1].created_at)) && (
                <div role="separator" className="flex items-center justify-center gap-3 shrink-0 py-2 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span className="rounded-full bg-muted px-3 py-1">{formatDate(item.created_at)}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
            {item._kind === "report" ? (
              <div
                key={`report-${item.id}`}
                className="max-w-[85%] mr-auto rounded-2xl rounded-tr-sm bg-emerald-50/90 border border-emerald-200/70 px-4 py-3.5 shadow-sm"
              >
                {/* Top section: Time and operator name */}
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900 mb-2 border-b border-emerald-200/50 pb-1.5">
                  <span className="flex items-center gap-1.5 shrink-0">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                    {item.employees?.full_name && (
                      <span className="text-emerald-800 font-semibold">{item.employees.full_name}</span>
                    )}
                  </span>
                  <span className="text-emerald-800/80 font-normal shrink-0">
                    {formatTime(item.created_at)}
                  </span>
                </div>
                {/* Middle section: Subject and report */}
                <div className="mb-2">
                  {item.subject && (
                    <div className="text-sm font-medium text-emerald-900 mb-1">
                      {item.subject}
                    </div>
                  )}
                  {item.report && (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {item.report}
                    </p>
                  )}
                </div>

                {/* Bottom section: Call duration and recording file */}
                <div className="pt-2 border-t border-emerald-200/60">
                  {formatDuration(item.start_time, item.end_time) && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-emerald-800/80">
                      <span>مدت: {formatDuration(item.start_time, item.end_time)}</span>
                    </div>
                  )}

                  {item.call_id && item.file_id && item.file_id !== "0" && (
                    <div className="mt-2">
                      {audioUrls[aKey(item)] ? (
                        <audio controls className="w-full h-9 rounded-lg">
                          <source src={audioUrls[aKey(item)]} type="audio/mpeg" />
                          مرورگر شما از پخش صوت پشتیبانی نمی‌کند.
                        </audio>
                      ) : audioLoading[aKey(item)] ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-800/70">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          در حال دریافت فایل صوتی…
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              ) : item._kind === "task" ? (
                <TaskBubble
                  item={item}
                  canDelete={employee?.role === "admin" || item.created_by === employee?.id}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
                ) : item._kind === "call" ? (
                  <CallLogBubble
                    item={item}
                    audioUrl={audioUrls[aKey(item)]}
                    audioLoading={audioLoading[aKey(item)]}
                  />
                ) : (
                  <MessageBubble
                    item={item}
                    replied={
                      item.reply_to_id
                        ? feed.find((f) => f._kind === "message" && f.id === item.reply_to_id)
                        : null
                    }
                    fileUrl={fileUrls[item.id]}
                    isOwn={item.employee_id === employee?.id}
                    isEditing={editingId === item.id}
                    editText={editText}
                    setEditText={setEditText}
                    savingEdit={savingEdit}
                    onReply={startReply}
                    onStartEdit={startEdit}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={saveEdit}
                    onJump={jumpTo}
                  />
            )}
            </React.Fragment>
          ))
        )}
        </div>
      </div>

      {/* نوار ارسال پیام / فایل / گزارش تماس */}
      <div className="border-t border-border px-3 sm:px-4 py-3 space-y-2 shrink-0">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs bg-accent/60 rounded-lg px-3 py-1.5 border-r-2 border-primary">
            <Reply className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{replyTo.employees?.full_name || "کارمند"}</p>
              <p className="truncate text-muted-foreground">
                {replyTo.message || replyTo.file_name || "فایل ضمیمه"}
              </p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {pendingFile && (
          <div className="flex items-center gap-2 text-xs bg-accent/60 rounded-lg px-3 py-1.5 w-fit">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{pendingFile.name}</span>
            <button
              type="button"
              onClick={clearPendingFile}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {sendError && <p className="text-xs text-destructive">{sendError}</p>}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept={ACCEPTED_FILES}
            onChange={handlePickFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground transition-colors shrink-0"
            aria-label="پیوست فایل"
            title="پیوست فایل"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={messageText}
              ref={inputRef}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="پیام بنویسید…"
              className="w-full h-10 rounded-full bg-accent/40 border border-transparent focus:border-ring focus:outline-none pr-4 pl-10 text-sm"
            />
            {(messageText.trim() || pendingFile) && (
              <button
                type="submit"
                disabled={sending}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                aria-label="ارسال پیام"
                title="ارسال پیام"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onAddTask?.()}
            className="w-9 h-9 rounded-full bg-amber-600 text-white grid place-items-center hover:opacity-90 active:scale-95 transition-all shrink-0"
            aria-label="ایجاد وظیفه"
            title="ایجاد وظیفه"
          >
            <ListTodo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onAddReport(new Date().toISOString())}
            className="w-9 h-9 rounded-full bg-emerald-600 text-white grid place-items-center hover:opacity-90 active:scale-95 transition-all shrink-0"
            aria-label="ثبت گزارش تماس"
            title="ثبت گزارش تماس"
          >
            <ClipboardEdit className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
function TaskBubble({ item, canDelete, onToggle, onDelete }) {
  const done = item.status === "done";
  const overdue = !done && item.due_date && new Date(item.due_date) < new Date();

  return (
    <div className="max-w-[85%] mr-auto rounded-2xl rounded-tr-sm bg-amber-50/90 border border-amber-200/70 px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-amber-900 mb-2 border-b border-amber-200/50 pb-1.5">
        <span className="flex items-center gap-1.5 shrink-0">
          <ListTodo className="w-3.5 h-3.5 text-amber-700" />
          {item.employees?.full_name && <span>{item.employees.full_name}</span>}
          <span className="font-normal text-amber-800/80">· وظیفه</span>
        </span>
        <span className="text-amber-800/80 font-normal shrink-0">
          {formatTime(item.created_at)}
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onToggle(item)}
          aria-label={done ? "بازگرداندن وظیفه" : "انجام شد"}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-full border grid place-items-center shrink-0 transition-colors",
            done
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-amber-400 hover:bg-amber-100"
          )}
        >
          {done && <Check className="w-3 h-3" />}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium text-amber-950 break-words",
              done && "line-through text-muted-foreground"
            )}
          >
            {item.subject}
          </p>
          {item.note && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words mt-1">
              {item.note}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800/80">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>مسئول: {item.assignee?.full_name || "—"}</span>
          {item.due_date && (
            <span className={cn(overdue && "text-destructive font-medium")}>
              مهلت: {formatJalali(new Date(item.due_date))}
              {overdue && " (گذشته)"}
            </span>
          )}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            aria-label="حذف وظیفه"
            className="w-6 h-6 rounded-md grid place-items-center text-amber-800/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
function MessageBubble({
  item, replied, fileUrl, isOwn, isEditing, editText, setEditText, savingEdit,
  onReply, onStartEdit, onCancelEdit, onSaveEdit, onJump,
}) {
  return (
    <div
      id={`msg-${item.id}`}
      className="group max-w-[85%] mr-auto rounded-2xl rounded-tr-sm bg-accent/70 border border-border px-4 py-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 text-xs font-semibold mb-1">
        <span className={colorForLabel(item.employees?.position || item.employees?.full_name)}>
          {item.employees?.full_name || "کارمند"}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground font-normal shrink-0">
          {!isEditing && (
            <span className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onReply(item)}
                aria-label="ریپلای"
                title="ریپلای"
                className="w-6 h-6 rounded-md grid place-items-center hover:bg-card hover:text-foreground"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              {isOwn && (
                <button
                  type="button"
                  onClick={() => onStartEdit(item)}
                  aria-label="ویرایش پیام"
                  title="ویرایش پیام"
                  className="w-6 h-6 rounded-md grid place-items-center hover:bg-card hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          )}
          {formatTime(item.created_at)}
        </span>
      </div>

      {replied && (
        <button
          type="button"
          onClick={() => onJump(replied.id)}
          className="mb-2 block w-full text-right rounded-lg bg-card/70 border-r-2 border-primary px-2.5 py-1.5 hover:bg-card transition-colors"
        >
          <p className="text-[11px] font-semibold truncate">
            {replied.employees?.full_name || "کارمند"}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {replied.message || replied.file_name || "فایل ضمیمه"}
          </p>
        </button>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            autoFocus
            className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancelEdit} disabled={savingEdit}
              className="text-xs px-3 h-8 rounded-full hover:bg-card">
              انصراف
            </button>
            <button type="button" onClick={() => onSaveEdit(item)} disabled={savingEdit}
              className="text-xs px-3 h-8 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-1 disabled:opacity-60">
              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              ذخیره
            </button>
          </div>
        </div>
      ) : (
        item.message && (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
            {item.message}
            {item.edited_at && (
              <span className="text-[10px] text-muted-foreground mr-1.5">(ویرایش شده)</span>
            )}
          </p>
        )
      )}

      {item.file_path && (
        <div className="mt-2">
          {item.file_type?.startsWith("image/") && fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <img src={fileUrl} alt={item.file_name} className="max-h-48 rounded-lg border border-border" />
            </a>
          ) : (
            <a
              href={fileUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
            >
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{item.file_name || "فایل ضمیمه"}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
