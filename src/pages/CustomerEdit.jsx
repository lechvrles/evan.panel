import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image } from "@/components/ui/image";
import {
  Loader2,
  Save,
  User,
  Phone,
  Mail,
  Briefcase,
  FolderKanban,
  MapPin,
  Camera,
  Frown,
  ArrowRight,
  StickyNote,
} from "lucide-react";
export default function CustomerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (fetchError || !data) setNotFound(true);
      else setForm(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("customer-avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("customer-avatars").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: data.publicUrl }));
    } catch {
      setError("بارگذاری تصویر ناموفق بود");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { id: _omit, created_at: _omit2, ...updates } = form;
      const { error: updateError } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id);
      if (updateError) throw updateError;
      navigate(`/customers/${id}`);
    } catch (err) {
      setError(err.message || "ذخیره تغییرات ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Frown className="w-10 h-10 text-muted-foreground mb-3 opacity-70" />
          <h2 className="font-heading text-lg font-semibold">مشتری یافت نشد</h2>
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

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/customers/${id}`)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        بازگشت به جزئیات
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* تصویر مشتری */}
        <section className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-6 sm:px-8 py-5 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
            <h1 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">
              ویرایش مشتری
            </h1>
            <p className="text-sm text-muted-foreground">
              {form.first_name} {form.last_name}
            </p>
          </div>
          <div className="p-6 sm:p-8 flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-accent grid place-items-center border border-border">
                {form.avatar_url ? (
                  <Image
                    src={form.avatar_url}
                    alt="پروفایل"
                    fittingType="fill"
                    className="w-full h-full"
                  />
                ) : (
                  <User className="w-8 h-8 text-foreground/40" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-sm border-2 border-card disabled:opacity-60"
                aria-label="تغییر تصویر"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              برای تغییر تصویر روی دوربین بزنید.
            </p>
          </div>
        </section>

        {/* اطلاعات شخصی */}
        <section className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-6 sm:px-8 py-5 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
            <h2 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">
              اطلاعات شخصی
            </h2>
          </div>
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="نام" required icon={User}>
              <Input value={form.first_name} onChange={set("first_name")} required className="h-11 pr-10" placeholder="نام" />
            </Field>
            <Field label="نام خانوادگی" required icon={User}>
              <Input value={form.last_name} onChange={set("last_name")} required className="h-11 pr-10" placeholder="نام خانوادگی" />
            </Field>
            <Field label="شماره تلفن" required icon={Phone}>
              <Input value={form.phone} onChange={set("phone")} required className="h-11 pr-10" placeholder="شماره تلفن" />
            </Field>
            <Field label="سمت شغلی در پروژه" icon={Briefcase}>
              <Input value={form.title || ""} onChange={set("title")} className="h-11 pr-10" placeholder="سمت" />
            </Field>
            <Field label="ایمیل" icon={Mail}>
              <Input type="email" value={form.email || ""} onChange={set("email")} className="h-11 pr-10" placeholder="ایمیل" />
            </Field>
          </div>
        </section>

        {/* اطلاعات پروژه */}
        <section className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-6 sm:px-8 py-5 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
            <h2 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">
              اطلاعات پروژه
            </h2>
          </div>
          <div className="p-6 sm:p-8 space-y-5">
            <Field label="نام پروژه" icon={FolderKanban}>
              <Input value={form.project_name || ""} onChange={set("project_name")} className="h-11 pr-10" placeholder="نام پروژه" />
            </Field>
            <Field label="موقعیت پروژه" icon={MapPin}>
              <Input value={form.project_location || ""} onChange={set("project_location")} className="h-11 pr-10" placeholder="موقعیت پروژه" />
            </Field>
          </div>
        </section>

        {/* اطلاعات تکمیلی */}
        <section className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-6 sm:px-8 py-5 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
            <h2 className="font-heading text-lg sm:text-xl font-semibold tracking-tight">
              اطلاعات تکمیلی
            </h2>
          </div>
          <div className="p-6 sm:p-8">
            <Field label="یادداشت" icon={StickyNote}>
              <textarea
                value={form.notes || ""}
                onChange={set("notes")}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="یادداشت"
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
            onClick={() => navigate(`/customers/${id}`)}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={saving || uploading} className="h-11 px-6">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                در حال ذخیره…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                ذخیره تغییرات
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
