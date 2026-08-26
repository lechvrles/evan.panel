import React from "react";
import { TrendingUp } from "lucide-react";

const profiles = [
  { name: "سوفیا بنت", role: "گردآورنده جواهرات لوکس", growth: "+۳۰٪", period: "این هفته", tint: "bg-[#f2d5a3]" },
  { name: "مَیسون واکر", role: "هماهنگ‌کننده مشتریان ویژه", growth: "+۱۸٪", period: "این هفته", tint: "bg-[#a3c9f2]" },
  { name: "آملیا لین", role: "مشاور بوتیک خصوصی", growth: "+۱۲٪", period: "این هفته", tint: "bg-[#c7a3f2]" },
];

export default function ProfileBar() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {profiles.map((p) => (
        <div
          key={p.name}
          className="rounded-3xl bg-card border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
        >
          <div className={`w-12 h-12 rounded-2xl ${p.tint} grid place-items-center text-sm font-semibold text-foreground/70`}>
            {p.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold text-[15px] truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground truncate">{p.role}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              {p.growth}
            </span>
            <span className="text-[11px] text-muted-foreground">{p.period}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
