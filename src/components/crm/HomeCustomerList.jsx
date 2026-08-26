import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Inbox, User, Pencil, ChevronLeft } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function HomeCustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active) return;
      setCustomers(error ? [] : data || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-heading text-base font-semibold">لیست مشتریان</h2>
        {!loading && customers && (
          <span className="text-xs text-muted-foreground">
            {customers.length} نفر
          </span>
        )}
      </div>

      <div className="p-2 min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Inbox className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">مشتری‌ای برای نمایش وجود ندارد.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {customers.map((c) => (
              <li
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/40 transition-colors cursor-pointer"
              >
                {/* سمت راست: عکس + نام و سمت پروژه */}
                <div className="w-11 h-11 rounded-full overflow-hidden bg-accent grid place-items-center shrink-0">
                  {c.avatar_url ? (
                    <Image
                      src={c.avatar_url}
                      alt={`${c.first_name} ${c.last_name}`}
                      fittingType="fill"
                      className="w-full h-full"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.title || "—"}
                  </p>
                </div>
                {/* سمت چپ: نام پروژه + ادیت + پیکان */}
                <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px] shrink-0">
                  {c.project_name || "—"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/customers/${c.id}/edit`);
                  }}
                  className="w-8 h-8 rounded-lg grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
                  aria-label="ویرایش مشتری"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/customers/${c.id}`);
                  }}
                  className="w-8 h-8 rounded-lg grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
                  aria-label="مشاهده جزئیات"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
