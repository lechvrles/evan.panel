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

// فقط حروف فارسی، فاصله و نیم‌فاصله مجازن (برای نام و نام‌خانوادگی)
const PERSIAN_NAME_REGEX = /^[\u0600-\u06FF\s\u200C]+$/;
// فقط حروف/عدد انگلیسی و کاراکترهای مجاز ایمیل
const EMAIL_CHARS_REGEX = /[^a-zA-Z0-9@._%+-]/g;
const EMAIL_FORMAT_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const stripToPersian = (value) => value.replace(/[^\u0600-\u06FF\s\u200C]/g, "");
const stripToDigits = (value) => value.replace(/\D/g, "").slice(0, 11);
const stripToEmailChars = (value) => value.replace(EMAIL_CHARS_REGEX, "");

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setName = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: stripToPersian(e.target.value) }));

  const setPhone = (e) =>
    setForm((f) => ({ ...f, phone: stripToDigits(e.target.value) }));

  const setEmail = (e) =>
    setForm((f) => ({ ...f, email: stripToEmailChars(e.target.value) }));

  const validate = () => {
    const errors = {};

    if (!form.first_name.trim() || !PERSIAN_NAME_REGEX.test(form.first_name.trim())) {
      errors.first_name = "نام باید فقط حروف فارسی باشد";
    }
    if (!form.last_name.trim() || !PERSIAN_NAME_REGEX.test(form.last_name.trim())) {
      errors.last_name = "نام خانوادگی باید فقط حروف فارسی باشد";
    }
    if (form.phone.length !== 11) {
      errors.phone = "شماره تلفن باید دقیقاً ۱۱ رقم باشد";
    }
    if (form.email.trim() && !EMAIL_FORMAT_REGEX.test(form.email.trim())) {
      errors.email = "فرمت ایمیل صحیح نیست (مثال: name@example.com)";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) {
      setError("لطفاً خطاهای فرم را برطرف کنید");
      return;
    }
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
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
            <Field label="نام" required icon={User} error={fieldErrors.first_name}>
              <Input
                value={form.first_name}
                onChange={setName("first_name")}
                required
                className="h-11 pr-10"
                placeholder="نام"
              />
            </Field>
            <Field label="نام خانوادگی" required icon={User} error={fieldErrors.last_name}>
              <Input
                value={form.last_name}
                onChange={setName("last_name")}
                required
                className="h-11 pr-10"
                placeholder="نام خانوادگی"
              />
            </Field>
            <Field label="شماره تلفن" required icon={Phone} error={fieldErrors.phone}>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={form.phone}
                onChange={setPhone}
                required
                className="h-11 pr-10"
                placeholder="۰۹xxxxxxxxx"
              />
            </Field>
            <Field label="سمت پروژه" icon={Briefcase}>
              <Input
                value={form.title}
                onChange={set("title")}
                className="h-11 pr-10"
                placeholder="مدیر پروژه"
              />
            </Field>
            <Field label="ایمیل" icon={Mail} error={fieldErrors.email}>
              <Input
                type="email"
                dir="ltr"
                value={form.email}
                onChange={setEmail}
                className="h-11 pr-10 text-left"
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
                placeholder="نام پروژه مشتری را وارد کنید"
              />
            </Field>
            <Field label="موقعیت پروژه" icon={MapPin}>
              <Input
                value={form.project_location}
                onChange={set("project_location")}
                className="h-11 pr-10"
                placeholder="مکان پروژه را وارد کنید"
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

function Field({ label, required, icon: Icon, error, children }) {
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
