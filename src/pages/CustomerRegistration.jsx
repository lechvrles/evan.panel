import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  Briefcase,
  User,
  FolderKanban,
  MapPin,
} from "lucide-react";
export default function CustomerRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    title: "",
    email: "",
    project_name: "",
    project_location: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from("customers").insert([form]);
      if (insertError) throw insertError;
      setSuccess(true);
      setTimeout(() => navigate("/"), 1400);
    } catch (err) {
      setError(err.message || "ثبت مشتری ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-heading text-2xl font-semibold">مشتری ثبت شد</h2>
        <p className="text-muted-foreground mt-1">
          {form.first_name} {form.last_name} به CRM شما اضافه شد.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* مرحله ۱ — اطلاعات شخصی */}
        <section className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
                ۱
              </span>
              <div>
                <h1 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">
                  اطلاعات شخصی
                </h1>
                <p className="text-sm text-muted-foreground">
                  مشخصات فردی مشتری را وارد کنید.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="نام" required icon={User}>
              <Input
                value={form.first_name}
                onChange={set("first_name")}
                required
                className="h-11 pr-10"
                placeholder="نام"
              />
            </Field>
            <Field label="نام خانوادگی" required icon={User}>
              <Input
                value={form.last_name}
                onChange={set("last_name")}
                required
                className="h-11 pr-10"
                placeholder="نام خانوادگی"
              />
            </Field>
            <Field label="شماره تلفن" required icon={Phone}>
              <Input
                value={form.phone}
                onChange={set("phone")}
                required
                className="h-11 pr-10"
                placeholder="+۹۸ ۹۱۲ ۰۰۰ ۰۰۰۰"
              />
            </Field>
            <Field label="سمت شغلی در پروژه" icon={Briefcase}>
              <Input
                value={form.title}
                onChange={set("title")}
                className="h-11 pr-10"
                placeholder="مدیر پروژه"
              />
            </Field>
            <Field label="ایمیل" icon={Mail}>
              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                className="h-11 pr-10"
                placeholder="customer@example.com"
              />
            </Field>
          </div>
        </section>

        {/* مرحله ۲ — اطلاعات پروژه */}
        <section className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
                ۲
              </span>
              <div>
                <h2 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">
                  اطلاعات پروژه
                </h2>
                <p className="text-sm text-muted-foreground">
                  پروژه‌ای که این مشتری به آن مربوط است را مشخص کنید.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            <Field label="نام پروژه" icon={FolderKanban}>
              <Input
                value={form.project_name}
                onChange={set("project_name")}
                className="h-11 pr-10"
                placeholder="پروژهSample"
              />
            </Field>
            <Field label="موقعیت پروژه" icon={MapPin}>
              <Input
                value={form.project_location}
                onChange={set("project_location")}
                className="h-11 pr-10"
                placeholder="تهران، خیابانSample"
              />
            </Field>
          </div>
        </section>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="destructive"
            onClick={() => navigate("/")}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={saving} className="h-11 px-6">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                در حال ذخیره…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 ml-2" />
                ثبت مشتری
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, icon: Icon, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive mr-0.5">*</span>}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        {children}
      </div>
    </div>
  );
}
