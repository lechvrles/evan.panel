import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PanelRight, Search, Bell, X, User as UserIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/NotificationsContext";
import { supabase } from "@/lib/supabaseClient";
import { Image } from "@/components/ui/image";

const LOGO = "https://media.base44.com/images/public/6a869b2036726c8f4d4f7204/9b5e3dc2c_-6.png";

export default function CrmHeader({ dashboardOpen, onToggleDashboard }) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const parts = q.split(/\s+/).filter(Boolean);
      let req = supabase
        .from("customers")
        .select("id, first_name, last_name, phone, avatar_url");

      if (parts.length >= 2) {
        req = req.or(
          `and(first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[1]}%),` +
          `and(first_name.ilike.%${parts[1]}%,last_name.ilike.%${parts[0]}%),` +
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`
        );
      } else {
        req = req.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`);
      }

      const { data, error } = await req.limit(8);
      setResults(error ? [] : data || []);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  };

  const goToCustomer = (id) => {
    closeSearch();
    navigate(`/customers/${id}`);
  };

  const ResultsList = () => {
    if (!query.trim()) return null;
    return (
      <div className="absolute top-full inset-x-0 mt-2 rounded-2xl bg-card shadow-[0_12px_32px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.06] overflow-hidden max-h-80 overflow-y-auto">
        {searching ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            مشتری‌ای پیدا نشد.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => goToCustomer(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-right"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-accent grid place-items-center shrink-0">
                    {c.avatar_url ? (
                      <Image
                        src={c.avatar_url}
                        alt={`${c.first_name} ${c.last_name}`}
                        fittingType="fill"
                        className="w-full h-full"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {c.first_name} {c.last_name}
                    </p>
                    {c.phone && (
                      <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-[52px]">
          {/* راست: آیکن داشبورد (طبق عکس: PanelRight) — باز می‌شود و در حالت باز محو */}
          <button
            onClick={onToggleDashboard}
            className={cn(
              "w-9 h-9 rounded-xl grid place-items-center transition-all duration-300 shrink-0 border border-border",
              dashboardOpen
                ? "opacity-0 pointer-events-none scale-90"
                : "bg-card text-foreground hover:bg-accent"
            )}
            aria-label="داشبورد"
          >
            <PanelRight className="w-[18px] h-[18px]" />
          </button>

          {/* وسط: در حالت بسته لوگو، در حالت باز جستجو */}
          <div className="flex-1 flex justify-center min-w-0">
            {dashboardOpen ? (
              <div className="relative w-full max-w-md">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی مشتریان، سفارش‌ها…"
                  className="w-full h-9 pr-10 pl-3 rounded-full bg-accent/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <ResultsList />
              </div>
            ) : (
              <img src={LOGO} alt="EVAN" className="h-8 w-auto" />
            )}
          </div>

          {/* چپ: اعلان‌ها، جستجو (فقط در حالت بسته) */}
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
            <button
              onClick={() => navigate("/notifications")}
              className="relative w-9 h-9 rounded-xl hover:bg-accent grid place-items-center transition-colors"
              aria-label="اعلان‌ها"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
              )}
            </button>
            {!dashboardOpen && (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-xl hover:bg-accent grid place-items-center transition-colors"
                aria-label="جستجو"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* پنل جستجوی تاشو (فقط در حالت بسته) */}
      {searchOpen && !dashboardOpen && (
        <div className="fixed top-[52px] inset-x-0 bottom-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeSearch}
          />
          <div className="absolute top-0 inset-x-0 mx-auto max-w-2xl px-4 pt-4">
            <div className="relative">
              <div className="relative flex items-center h-14 rounded-full bg-card shadow-[0_12px_32px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.06]">
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی مشتریان، سفارش‌ها، محصولات…"
                  className="w-full h-full pr-12 pl-12 rounded-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={closeSearch}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-accent grid place-items-center text-muted-foreground transition-colors"
                  aria-label="بستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ResultsList />
            </div>
          </div>
        </div>
      )}
    </>
  );
}