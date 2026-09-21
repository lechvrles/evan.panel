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
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_FILES =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv";
const MAX_FILE_MB = 15;

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

export default function CallTimeline({ customerId, customerName, refreshKey, onAddReport }) {
  const { employee } = useAuth();
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesRefresh, setMessagesRefresh] = useState(0);

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

  useEffect(() => {
    setFeed(null);
    followLatestRef.current = true;
  }, [customerId]);

  // فقط ناحیهٔ پیام‌ها جابه‌جا شود، نه صفحهٔ اصلی.
  useLayoutEffect(() => {
    if (!loading && followLatestRef.current && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [feed, loading]);

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
      const [{ data: reportsData, error: reportsError }, { data: messagesData, error: messagesError }] =
        await Promise.all([
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
        ]);
      if (!active) return;
      const merged = [
        ...(reportsError ? [] : (reportsData || []).map((r) => ({ ...r, _kind: "report" }))),
        ...(messagesError ? [] : (messagesData || []).map((m) => ({ ...m, _kind: "message" }))),
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setFeed(merged);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [customerId, refreshKey, messagesRefresh]);

  // پخش صوت تماس‌ها (همون منطق قبلی)
  useEffect(() => {
    if (!feed?.length) return;
    const withCall = feed.filter(
      (r) => r._kind === "report" && r.call_id && r.file_id && r.file_id !== "0" && !audioUrls[r.id]
    );
    if (!withCall.length) return;

    let createdUrls = [];
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      for (const r of withCall) {
        setAudioLoading((prev) => ({ ...prev, [r.id]: true }));
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
            setAudioLoading((prev) => ({ ...prev, [r.id]: false }));
            continue;
          }
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          createdUrls.push(objUrl);
          if (!cancelled) setAudioUrls((prev) => ({ ...prev, [r.id]: objUrl }));
        } catch {
          /* بی‌صدا رد می‌شیم */
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
          message: messageText.trim(),
          file_path,
          file_name,
          file_type,
        },
      ]);
      if (insertError) throw insertError;

      setMessageText("");
      clearPendingFile();
      followLatestRef.current = true;
      setMessagesRefresh((k) => k + 1);
    } catch (err) {
      setSendError(err.message || "ارسال پیام ناموفق بود");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-[28px] bg-card border border-border shadow-sm flex flex-col h-[70dvh] lg:h-[calc(100dvh-12rem)] min-h-[20rem] min-w-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h2 className="font-heading text-base font-semibold">{customerName}</h2>
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
          isEmpty ? "items-center justify-center" : "space-y-4"
        )}
      >
        {loading && !feed ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : isEmpty ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">هنوز پیام یا گزارشی ثبت نشده.</p>
          </div>
        ) : (
          feed?.map((item, index) => (
            <React.Fragment key={`${item._kind}-${item.id}`}>
              {(index === 0 || formatDate(item.created_at) !== formatDate(feed[index - 1].created_at)) && (
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
                    {formatTime(item.created_at)}
                    {item.employees?.full_name && (
                      <span className="text-emerald-800 font-normal mr-2">• {item.employees.full_name}</span>
                    )}
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
                      {audioUrls[item.id] ? (
                        <audio controls className="w-full h-9 rounded-lg">
                          <source src={audioUrls[item.id]} type="audio/mpeg" />
                          مرورگر شما از پخش صوت پشتیبانی نمی‌کند.
                        </audio>
                      ) : audioLoading[item.id] ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-800/70">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          در حال دریافت فایل صوتی…
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                key={`msg-${item.id}`}
                className="max-w-[85%] mr-auto rounded-2xl rounded-tr-sm bg-accent/70 border border-border px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 text-xs font-semibold mb-1">
                  <span className={colorForLabel(item.employees?.position || item.employees?.full_name)}>
                    {item.employees?.full_name || "کارمند"}
                  </span>
                  <span className="text-muted-foreground font-normal shrink-0">
                    {formatTime(item.created_at)}
                  </span>
                </div>

                {item.message && (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{item.message}</p>
                )}

                {item.file_path && (
                  <div className="mt-2">
                    {item.file_type?.startsWith("image/") && fileUrls[item.id] ? (
                      <a href={fileUrls[item.id]} target="_blank" rel="noreferrer">
                        <img
                          src={fileUrls[item.id]}
                          alt={item.file_name}
                          className="max-h-48 rounded-lg border border-border"
                        />
                      </a>
                    ) : (
                    <a
                      href={fileUrls[item.id] || "#"}
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
            )}
            </React.Fragment>
          ))
        )}
        </div>
      </div>

      {/* نوار ارسال پیام / فایل / گزارش تماس */}
      <div className="border-t border-border px-3 sm:px-4 py-3 space-y-2 shrink-0">
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
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="پیام بنویسید…"
              className="w-full h-8 rounded-full bg-accent/40 border border-transparent focus:border-ring focus:outline-none pr-3 pl-9 text-xs"
            />
            <button
              type="submit"
              disabled={sending || (!messageText.trim() && !pendingFile)}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              aria-label="ارسال پیام"
              title="ارسال پیام"
            >
              {sending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>

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
