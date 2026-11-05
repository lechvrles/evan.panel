import React, { useEffect, useState } from "react";
import { Loader2, Search, User as UserIcon, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const toLocal = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  return d.length >= 10 ? `0${d.slice(-10)}` : d;
};

export default function AttachPhoneDialog({ open, onClose, phone, onDone }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const local = toLocal(phone);
  const navigate = useNavigate();


  useEffect(() => {
    if (open) { setQuery(""); setResults([]); setError(""); }
  }, [open]);

  useEffect(() => {
    const q = query.trim().replace(/[,()%]/g, "");
    if (!open || !q) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data, error: err } = await supabase
        .from("customers")
        .select("id, first_name, last_name, phone, phone2")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,phone2.ilike.%${q}%`)
        .limit(8);
      setResults(err ? [] : data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  if (!open) return null;

  const attach = async (c) => {
    const name = `${c.first_name} ${c.last_name}`;
    if (c.phone2 && !window.confirm(`«${name}» از قبل شماره دوم (${c.phone2}) دارد. جایگزین شود؟`)) return;
    setSavingId(c.id);
    setError("");
    const { error: err } = await supabase.from("customers").update({ phone2: local }).eq("id", c.id);
    setSavingId(null);
    if (err) { setError(err.message || "ذخیره شماره ناموفق بود"); return; }
    onDone?.(c.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-[28px] border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-base font-semibold">افزودن مشتری</h2>
          <button onClick={onClose} aria-label="بستن"
            className="w-8 h-8 rounded-lg hover:bg-accent grid place-items-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            شماره <span dir="ltr" className="font-medium text-foreground">{local}</span>{" "}را به یک مشتری قبلی اضافه کنید یا مشتری جدید ثبت کنید.
          </p>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام یا شماره مشتری…" className="h-10 pr-10" />
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {searching ? (
              <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : query.trim() && results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">مشتری‌ای پیدا نشد.</p>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((c) => (
                  <li key={c.id}>
                    <button type="button" disabled={savingId === c.id} onClick={() => attach(c)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-accent rounded-lg text-right disabled:opacity-60">
                      <div className="w-8 h-8 rounded-full bg-accent grid place-items-center shrink-0">
                        {savingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserIcon className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.phone, c.phone2].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/customers/register", { state: { phone: local } });
              }}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-4 h-4" />
              ثبت مشتری جدید
            </button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
