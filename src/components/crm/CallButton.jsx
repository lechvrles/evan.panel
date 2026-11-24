import React, { useState } from "react";
import { Loader2, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function CallButton({ phone, phone2, customerName, onCallSuccess }) {
  const [status, setStatus] = useState("idle"); // idle | calling | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const numbers = [
    phone && { label: "شماره اول", value: phone },
    phone2 && { label: "شماره دوم", value: phone2 },
  ].filter(Boolean);

  const placeCall = async (number) => {
    if (!number || status === "calling") return;
    setPickerOpen(false);
    setStatus("calling");
    setErrorMsg("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/call-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ phone: number }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "برقراری تماس ناموفق بود");
      setStatus("success");
      onCallSuccess?.(json.created_at || new Date().toISOString());
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "خطا در برقراری تماس");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const disabled = numbers.length === 0 || status === "calling";

  const buttonClass = cn(
    "w-9 h-9 rounded-full grid place-items-center transition-all shadow-sm",
    status === "success"
      ? "bg-emerald-500 text-white"
      : status === "error"
      ? "bg-destructive text-destructive-foreground"
      : "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
    disabled && "opacity-60 cursor-not-allowed"
  );

  const icon =
    status === "calling" ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : status === "success" ? (
      <CheckCircle2 className="w-4 h-4" />
    ) : status === "error" ? (
      <XCircle className="w-4 h-4" />
    ) : (
      <PhoneCall className="w-4 h-4" />
    );

  const statusText =
    status === "calling"
      ? "در حال برقراری تماس…"
      : status === "success"
      ? "تماس برقرار شد"
      : status === "error"
      ? errorMsg || "خطا در تماس"
      : "";

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2">
      {statusText && (
        <p className="text-xs text-muted-foreground max-w-[150px] truncate">{statusText}</p>
      )}

      {numbers.length > 1 ? (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={buttonClass}
              aria-label={`تماس با ${customerName}`}
              title="انتخاب شماره برای تماس"
            >
              {icon}
            </button>
          </PopoverTrigger>
          <PopoverContent dir="rtl" align="start" side="top" className="w-60 p-1.5">
            <p className="px-2 py-1.5 text-xs text-muted-foreground">با کدام شماره تماس بگیرم؟</p>
            {numbers.map((n) => (
              <button
                key={n.value}
                type="button"
                onClick={() => placeCall(n.value)}
                className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-right hover:bg-accent transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
                  <PhoneCall className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">{n.label}</span>
                  <span dir="ltr" className="block text-sm font-medium text-right">
                    {n.value}
                  </span>
                </span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      ) : (
        <button
          type="button"
          onClick={() => placeCall(numbers[0]?.value)}
          disabled={disabled}
          className={buttonClass}
          aria-label={`تماس با ${customerName}`}
          title={numbers[0] ? `تماس با ${numbers[0].value}` : "شماره تلفن ثبت نشده"}
        >
          {icon}
        </button>
      )}
    </div>
  );
}
