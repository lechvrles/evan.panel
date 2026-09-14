import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // شنبه‌محور
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

function toJalali(date) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  return {
    jy: Number(parts.find((p) => p.type === "year").value),
    jm: Number(parts.find((p) => p.type === "month").value),
    jd: Number(parts.find((p) => p.type === "day").value),
  };
}

function fromJalali(jy, jm, jd) {
  let d = new Date(jy + 621, jm - 1, jd, 12);
  for (let i = 0; i < 400; i++) {
    const j = toJalali(d);
    const diff = jy * 10000 + jm * 100 + jd - (j.jy * 10000 + j.jm * 100 + j.jd);
    if (diff === 0) break;
    d = new Date(d.getTime() + Math.sign(diff) * 86400000);
  }
  return d;
}

function jalaliMonthLength(jy, jm) {
  const start = fromJalali(jy, jm, 1);
  const next = jm === 12 ? fromJalali(jy + 1, 1, 1) : fromJalali(jy, jm + 1, 1);
  return Math.round((next - start) / 86400000);
}

export function formatJalali(date) {
  if (!date) return "";
  const { jy, jm, jd } = toJalali(date);
  return `${toFa(jy)}/${toFa(String(jm).padStart(2, "0"))}/${toFa(String(jd).padStart(2, "0"))}`;
}

export default function JalaliDatePicker({ value, onChange, className }) {
  const today = toJalali(new Date());
  const initial = value ? toJalali(value) : today;
  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm });

  const selected = value ? toJalali(value) : null;
  const firstWeekday = (fromJalali(view.jy, view.jm, 1).getDay() + 1) % 7; // شنبه=۰
  const daysInMonth = jalaliMonthLength(view.jy, view.jm);

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const moveMonth = (delta) => {
    let { jy, jm } = view;
    jm += delta;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    }
    if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    setView({ jy, jm });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? formatJalali(value) : "انتخاب تاریخ"}
          </span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3" dir="rtl">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-7 w-7 place-items-center rounded-md border border-input hover:bg-muted"
            aria-label="ماه بعد"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium">
            {JALALI_MONTHS[view.jm - 1]} {toFa(view.jy)}
          </div>
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-7 w-7 place-items-center rounded-md border border-input hover:bg-muted"
            aria-label="ماه قبل"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-[11px] text-muted-foreground">
              {w}
            </div>
          ))}
          {cells.map((day, i) =>
            day == null ? (
              <div key={`empty-${i}`} />
            ) : (
              <button
                key={day}
                type="button"
                onClick={() => onChange(fromJalali(view.jy, view.jm, day))}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg text-sm transition-colors hover:bg-muted",
                  selected &&
                    selected.jy === view.jy &&
                    selected.jm === view.jm &&
                    selected.jd === day &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  today.jy === view.jy &&
                    today.jm === view.jm &&
                    today.jd === day &&
                    !(
                      selected &&
                      selected.jy === view.jy &&
                      selected.jm === view.jm &&
                      selected.jd === day
                    ) &&
                    "border border-ring"
                )}
              >
                {toFa(day)}
              </button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
