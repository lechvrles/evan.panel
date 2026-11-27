import React, { useEffect, useState } from "react";
import { Plus, X, Search, Loader2, User as UserIcon, PenLine } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// value: { referrer_customer_id, referrer_name }
export default function ReferrerPicker({ value, onChange, excludeId }) {
  const id = value?.referrer_customer_id || null;
  const freeName = value?.referrer_name || "";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linkedName, setLinkedName] = useState("");

  // نام مشتریِ انتخاب‌شده
  useEffect(() => {
    if (!id) {
      setLinkedName("");
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("first_name, last_name")
        .eq("id", id)
        .maybeSingle();
      if (active && data) setLinkedName(`${data.first_name} ${data.last_name}`);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // جستجوی مشتری‌ها
  useEffect(() => {
    const q = query.trim().replace(/[,()%]/g, "");
    if (!open || !q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const parts = q.split(/\s+/).filter(Boolean);
      let req = supabase.from("customers").select("id, first_name, last_name, phone");
      req =
        parts.length >= 2
          ? req.or(
              `and(first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[1]}%),` +
                `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`
            )
          : req.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`);
      if (excludeId) req = req.neq("id", excludeId);
      const { data, error } = await req.limit(8);
      setResults(error ? [] : data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open, excludeId]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const pickCustomer = (c) => {
    setLinkedName(`${c.first_name} ${c.last_name}`);
    onChange({ referrer_customer_id: c.id, referrer_name: null });
    close();
  };

  const pickFreeText = () => {
    const text = query.trim();
    if (!text) return;
    onChange({ referrer_customer_id: null, referrer_name: text });
    close();
  };

  const clear = () => onChange({ referrer_customer_id: null, referrer_name: null });

  const shownName = id ? linkedName : freeName;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shownName && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/60 pl-1.5 pr-3 h-9 text-sm">
          {id ? (
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <PenLine className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          {shownName}
          <button
            type="button"
            onClick={clear}
            aria-label="حذف معرف"
            className="w-6 h-6 rounded-full grid place-items-center text-muted-foreground hover:bg-card hover:text-destructive transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}

      <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={shownName ? "تغییر معرف" : "افزودن معرف"}
            title={shownName ? "تغییر معرف" : "افزودن معرف"}
            className="w-9 h-9 rounded-full border border-border grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </PopoverTrigger>

        <PopoverContent dir="rtl" align="start" className="w-72 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام مشتری یا نوشتن نام معرف…"
              className="h-9 pr-9"
            />
          </div>

          <div className="max-h-52 overflow-y-auto scrollbar-thin">
            {searching ? (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <ul className="space-y-0.5">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-right hover:bg-accent transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-accent grid place-items-center shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">
                          {c.first_name} {c.last_name}
                        </span>
                        {c.phone && (
                          <span className="block text-xs text-muted-foreground">{c.phone}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {query.trim() && (
            <button
              type="button"
              onClick={pickFreeText}
              className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-right hover:bg-accent transition-colors"
            >
              <PenLine className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">استفاده از «{query.trim()}» (متن آزاد)</span>
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
