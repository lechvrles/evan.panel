# مهاجرت از base44 و استقرار روی Vercel

این پروژه قبلاً کاملاً به بک‌اند اختصاصی base44 (دیتابیس + احراز هویت + ۷ تابع سرور) وابسته بود.
حالا این‌ها با **Supabase** جایگزین شدن، و فرانت‌اند React/Vite مستقیماً روی **Vercel** اجرا می‌شه.

تغییرات کلیدی:
- `@base44/sdk` و `@base44/vite-plugin` حذف شدن، `@supabase/supabase-js` اضافه شد.
- پوشه `base44/` (تعریف entity ها و توابع سرور) حذف شد؛ معادلش در `supabase/schema.sql` هست.
- دو سیستم لاگین قبلی (کاربر عمومی base44 + کارمند جدا) یکی شدن: حالا فقط یک صفحه `/login` با ایمیل/رمز عبور از طریق Supabase Auth وجود داره.
- صفحات `Register`, `OAuthConsent` که مخصوص پلتفرم base44 بودن (نه منطق واقعی CRM) حذف شدن.
- آپلود عکس (پروفایل کارمند و مشتری) به جای `base44.integrations.Core.UploadFile` از Supabase Storage استفاده می‌کنه.

## مرحله ۱ — ساخت پروژه Supabase

1. یک پروژه رایگان در https://supabase.com بسازید.
2. توی **SQL Editor** فایل `supabase/schema.sql` رو کپی و اجرا کنید (جدول‌های `customers` و `employees`، سیاست‌های RLS، و باکت‌های Storage رو می‌سازه).
3. از **Settings → API**، مقادیر `Project URL` و `anon public key` رو بردارید.
4. **Authentication → Providers**: Email/Password باید فعال باشه (پیش‌فرض هست).
5. **Authentication → Email Templates**: می‌تونید لینک `reset password` رو به `https://YOUR-DOMAIN/reset-password` تنظیم کنید (بعد از دیپلوی روی Vercel).

## مرحله ۲ — ساخت کارمند اول (چون ثبت‌نام عمومی نداریم)

توی Supabase Dashboard:
- **Authentication → Users → Add user** یک کاربر با ایمیل/پسورد بسازید.
- به محض ساخت، تریگر `handle_new_user` خودکار یک ردیف توی جدول `employees` می‌سازه (نقش پیش‌فرض: `employee`).
- برای دسترسی ادمین، توی **Table Editor → employees** مقدار `role` همون کاربر رو به `admin` تغییر بدید.

## مرحله ۳ — اجرای محلی (تست قبل از دیپلوی)

```bash
# روی آرچ لینوکس، اگه Node/npm نصب نیست:
sudo pacman -S nodejs npm
# یا برای نسخه‌ی خاص از AUR:
yay -S nvm

cp .env.example .env.local
# مقادیر VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY رو پر کنید

npm install
npm run dev
```

## مرحله ۴ — دیپلوی روی Vercel

گزینه ۱ (وب، بدون نصب چیزی):
1. ریپوی گیت‌هابتون رو مستقیم به https://vercel.com/new وصل کنید.
2. Framework Preset: **Vite** (خودکار تشخیص داده میشه).
3. توی بخش Environment Variables دو مقدار رو اضافه کنید:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy بزنید.

گزینه ۲ (از خط فرمان، روی آرچ):
```bash
# نصب Vercel CLI — از AUR:
yay -S vercel-cli-bin
# یا از طریق npm:
npm install -g vercel

vercel login
vercel            # دیپلوی preview
vercel --prod     # دیپلوی نهایی
```
موقع اجرای `vercel`، همون دو Environment Variable بالا رو وقتی ازتون پرسید وارد کنید (یا از قبل با `vercel env add` تنظیم کنید).

فایل `vercel.json` توی ریشه پروژه یک rewrite برای SPA اضافه کرده (تا مسیرهای react-router مثل `/customers/1` روی رفرش ۴۰۴ ندن).

## نکات امنیتی که در مهاجرت رعایت شد

- در نسخه base44، رمز عبور کارمندها به‌صورت متن ساده مقایسه/ذخیره می‌شد. الان تمام رمزها توسط **Supabase Auth** هش و مدیریت می‌شن.
- دسترسی به جدول‌های `customers`/`employees` با **Row Level Security** محدود به کاربرهای لاگین‌شده است.

## کارهای اختیاری بعدی

- لوگوی فعلی (`media.base44.com`) یک CDN عمومیه که همچنان کار می‌کنه، ولی بهتره عکس رو دانلود و توی `public/` پروژه خودتون بذارید.
- اگه چند نقش (ادمین/کارمند) نیاز به محدودیت دسترسی متفاوت به داده‌ها دارن، سیاست‌های RLS توی `supabase/schema.sql` رو دقیق‌تر کنید (الان همه‌ی کارمندهای لاگین‌شده به همه‌چیز دسترسی کامل دارن).
