import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  User,
  Pencil,
  ArrowRight,
  Frown,
  Phone,
  Mail,
  FolderKanban,
  MapPin,
  CalendarClock,
  StickyNote,
} from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (error || !data) setNotFound(true);
      else setCustomer(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Frown className="w-10 h-10 text-muted-foreground mb-3 opacity-70" />
          <h2 className="font-heading text-lg font-semibold">مشتری یافت نشد</h2>
          <p className="text-sm text-muted-foreground mt-1">
            این مشتری ممکن است حذف شده باشد.
          </p>
          <button
            onClick={() => navigate("/customers")}
            className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به لیست
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${customer.first_name} ${customer.last_name}`;
  const editTo = `/customers/${id}/edit`;

  const editButton = (label) => (
    <button
      onClick={() => navigate(editTo)}
      aria-label={label}
      className="absolute top-3 left-3 w-9 h-9 rounded-full border border-foreground text-foreground grid place-items-center hover:bg-accent transition-colors"
    >
      <Pencil className="w-4 h-4" />
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => navigate("/customers")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        بازگشت به لیست
      </button>

      {/* ستون راست (یک‌سوم) — قالب مربعی + قالب مستطیلی */}
      <div className="lg:w-1/3 space-y-6">
        {/* قالب مربعی — عکس، نام و سمت پروژه (وسط‌چین) */}
        <div className="relative rounded-[28px] bg-card border border-border overflow-hidden shadow-sm aspect-square flex flex-col items-center justify-center text-center p-6">
          {editButton("ویرایش مشتری")}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-accent grid place-items-center">
            {customer.avatar_url ? (
              <Image
                src={customer.avatar_url}
                alt={fullName}
                fittingType="fill"
                className="w-full h-full"
              />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <h1 className="font-heading text-xl font-semibold mt-4">{fullName}</h1>
          {customer.title && (
            <p className="text-sm text-muted-foreground mt-1">{customer.title}</p>
          )}
        </div>

        {/* قالب مستطیل عمودی — جزئیات دیگر */}
        <div className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
            <h2 className="font-heading text-base font-semibold">جزئیات دیگر</h2>
            <button
              onClick={() => navigate(editTo)}
              aria-label="ویرایش مشتری"
              className="w-9 h-9 rounded-full border border-foreground text-foreground grid place-items-center hover:bg-accent transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-4">
            <InfoRow icon={Phone} label="شماره تلفن" value={customer.phone} />
            <InfoRow icon={Mail} label="ایمیل" value={customer.email} />
            <InfoRow icon={FolderKanban} label="نام پروژه" value={customer.project_name} />
            <InfoRow icon={MapPin} label="موقعیت پروژه" value={customer.project_location} />
            <InfoRow
              icon={CalendarClock}
              label="تاریخ ثبت"
              value={
                customer.created_at
                  ? new Date(customer.created_at).toLocaleDateString("fa-IR")
                  : ""
              }
            />
            {customer.notes && (
              <InfoRow icon={StickyNote} label="یادداشت" value={customer.notes} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-accent/60 grid place-items-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className={cn(Icon ? "" : "pr-11", "min-w-0 flex-1")}>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words mt-0.5">
          {value ? value : "—"}
        </p>
      </div>
    </div>
  );
}
