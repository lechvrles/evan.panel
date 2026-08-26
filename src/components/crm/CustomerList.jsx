import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Inbox, User, Pencil, ChevronLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

// مشتری «تکمیل‌نشده» = فقط فیلدهای ضروری پر شده‌اند (اطلاعات پروژه/اختیاری خالی است)
function isIncomplete(c) {
  return !c.email && !c.title && !c.project_name && !c.project_location;
}

const FILTERS = [
  { id: "all", label: "همه" },
  { id: "incomplete", label: "تکمیل نشده" },
];

const COLUMNS = [
  "عکس",
  "نام و نام خانوادگی",
  "شماره تلفن",
  "ایمیل",
  "نام پروژه",
  "سمت پروژه",
];

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

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

  const filtered = customers
    ? filter === "incomplete"
      ? customers.filter(isIncomplete)
      : customers
    : [];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* هدر: فیلتر سمت چپ، شمارش سمت راست */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-1 bg-accent/60 rounded-full p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3.5 h-8 rounded-full text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!loading && customers && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} نفر
          </span>
        )}
      </div>

      <div className="min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Inbox className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm">مشتری‌ای برای نمایش وجود ندارد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-muted-foreground bg-accent/30">
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="font-medium px-4 py-3 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                  <th className="px-2 py-3 bg-accent/30"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="cursor-pointer hover:bg-accent/40 border-t border-border transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-accent grid place-items-center shrink-0">
                        {c.avatar_url ? (
                          <Image
                            src={c.avatar_url}
                            alt={`${c.first_name} ${c.last_name}`}
                            fittingType="fill"
                            className="w-full h-full"
                          />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.project_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.title || "—"}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c.id}/edit`);
                          }}
                          className="w-7 h-7 rounded-lg grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="ویرایش مشتری"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c.id}`);
                          }}
                          className="w-7 h-7 rounded-lg grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="مشاهده جزئیات"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
