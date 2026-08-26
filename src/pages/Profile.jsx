import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Camera,
  User as UserIcon,
  Lock,
  Save,
} from "lucide-react";
import { Image } from "@/components/ui/image";

export default function Profile() {
  const navigate = useNavigate();
  const { employee, refreshEmployee } = useAuth();
  const fileRef = useRef(null);

  const [fullName, setFullName] = useState(employee?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(employee?.avatar_url || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${employee.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      setError("بارگذاری تصویر ناموفق بود");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password && password !== confirm) {
      setError("رمز عبورها یکسان نیستند");
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("employees")
        .update({ full_name: fullName, avatar_url: avatarUrl })
        .eq("id", employee.id);
      if (updateError) throw updateError;

      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      await refreshEmployee();
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch (err) {
      setError(err.message || "ذخیره تغییرات ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-[28px] bg-card border border-border overflow-hidden shadow-sm">
        <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-border bg-gradient-to-bl from-accent/60 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight">
                پروفایل کارمند
              </h1>
              <p className="text-sm text-muted-foreground">
                تصویر، نام و رمز عبور خود را ویرایش کنید.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-accent grid place-items-center border border-border">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="پروفایل"
                    fittingType="fill"
                    className="w-full h-full"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-foreground/40" />
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
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fullName || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {employee?.role || employee?.email}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                برای تغییر تصویر روی دوربین بزنید.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>نام و نام خانوادگی</Label>
            <div className="relative">
              <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 pr-10"
                placeholder="نام کامل"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>رمز عبور جدید</Label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>تکرار رمز عبور</Label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            در صورت خالی گذاشتن رمز، رمز فعلی حفظ می‌شود.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          {done && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
              تغییرات ذخیره شد.
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => navigate("/")}
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
    </div>
  );
}
