# 🗺️ راهنمای فایل‌های پروژه evan.crm

این راهنما می‌گه هر صفحه از سایت به کدوم فایل ختم می‌شه و ساختار کلی پروژه چطوره.

> ⚠️ این فایل فعلاً توضیحیه و به `README.md` اضافه نشده.

---

## 📌 معماری کلی

پروژه یک CRM ساده است:

- **فرانت‌اند**: React + Vite (فولدر `src/`)
- **بک‌اند (Serverless Functions)**: فولدر `api/` (قابل دیپلوی روی Vercel)
- **دیتابیس/احراز هویت**: Supabase (`src/lib/supabaseClient.js`)

---

## 🎯 نقشه صفحات سایت → فایل‌ها

مپ روت‌ها در فایل `src/App.jsx` تعریف شده. خلاصه:

| مسیر سایت (URL) | صفحه (Page) | توضیح |
|---|---|---|
| `/login` | `src/pages/Login.jsx` | صفحه ورود (با Google Auth) |
| `/` | `src/pages/Home.jsx` | داشبورد اصلی بعد از لاگین |
| `/customers` | `src/pages/CustomersPage.jsx` | لیست مشتری‌ها |
| `/customers/register` | `src/pages/CustomerRegistration.jsx` | ثبت مشتری جدید |
| `/customers/:id` | `src/pages/CustomerDetail.jsx` | جزئیات یک مشتری |
| `/customers/:id/edit` | `src/pages/CustomerEdit.jsx` | ویرایش مشتری |
| `/profile` | `src/pages/Profile.jsx` | پروفایل کاربر |
| `/employees` | `src/pages/Employees.jsx` | مدیریت کارمندها |
| `/notifications` | `src/pages/Notifications.jsx` | اعلان‌ها |
| `/calls` | `src/pages/CallHistory.jsx` | تاریخچه تماس‌ها |
| هر مسیر نامعتبر (`*`) | `src/lib/PageNotFound.jsx` | صفحه 404 |

### ترتیب رندر هر صفحه

```
کاربر → src/main.jsx → src/App.jsx → Route انتخابی
        ↓
        ProtectedRoute.jsx (چک لاگین بودن)
        ↓
        EmployeeAuth.jsx (چک اینکه کارمند ثبت‌شده باشه)
        ↓
        CrmLayout.jsx (قاب کلی: سایدبار + هدر)
        ↓
        Page مورد نظر (مثلاً Home.jsx)
```

---

## 🗂️ فولدر `src/`

| مسیر | توضیح |
|---|---|
| `src/main.jsx` | نقطه شروع اپ، مونت به DOM |
| `src/App.jsx` | تعریف همه روت‌ها و مسیرها |
| `src/pages/` | صفحات اصلی سایت (هر فایل = یک URL) |
| `src/components/crm/` | کامپوننت‌های اختصاصی CRM |
| `src/components/ui/` | کامپوننت‌های آماده shadcn/ui (Button, Dialog, Table و…) |
| `src/components/` | کامپوننت‌های عمومی (Auth, GoogleIcon, ScrollToTop و…) |
| `src/hooks/` | هوک‌های ری‌اکت (use-mobile, use-size) |
| `src/lib/` | یوتیلیتی‌ها و کانتکست‌ها (Supabase client, Auth, Roles, Notifications و…) |
| `src/index.css` | استایل‌های سراسری + Tailwind |

### کامپوننت‌های مهم `src/components/crm/`

| فایل | نقش |
|---|---|
| `CrmLayout.jsx` | قالب کلی صفحات بعد از لاگین (سایدبار + هدر + محتوا) |
| `DashboardSidebar.jsx` | منوی کنار صفحه داشبورد |
| `CrmHeader.jsx` | هدر بالای صفحات |
| `EmployeeAuth.jsx` | محافظ مسیرها — دسترسی فقط برای کارمندهای تاییدشده |
| `CustomerList.jsx` / `HomeCustomerList.jsx` | لیست مشتری‌ها (داخل صفحه لیست و صفحه اصلی) |
| `ProfileBar.jsx` | نوار پروفایل کاربر |
| `CallReportPanel.jsx` | پنل گزارش تماس |
| `CallTimeline.jsx` | تایم‌لاین تماس‌ها |

---

## 🌐 فولدر `api/` (بک‌اند / Serverless)

| فایل | کارش |
|---|---|
| `_admin.js` | هِلپر مشترک برای اتصال به Supabase Admin |
| `create-employee.js` | API ساخت کارمند جدید |
| `reset-employee-password.js` | API ریست پسورد کارمند |
| `delete-employee.js` | API حذف کارمند |
| `call-customer.js` | API ثبت/مدیریت تماس با مشتری |
| `telefonchy-webhook.js` | وبهوک سرویس تماس telefonchy |

---

## ⚙️ فایل‌های ریشه

| فایل | توضیح |
|---|---|
| `package.json` | لیست پکیج‌ها و اسکریپت‌ها (dev / build / start) |
| `vite.config.js` | تنظیمات Vite |
| `tailwind.config.js` | تنظیمات Tailwind CSS |
| `postcss.config.js` | تنظیمات PostCSS |
| `jsconfig.json` | مسیرهای alias مثل `@/` |
| `components.json` | تنظیمات shadcn/ui |
| `vercel.json` | تنظیمات دیپلوی روی Vercel |
| `index.html` | فایل HTML اصلی (توش `main.jsx` لود می‌شه) |
| `dist/` | خروجی build نهایی |

---

## 🔄 جریان کاری سریع

- **اضافه کردن صفحه جدید**: یه فایل تو `src/pages/` بساز → تو `src/App.jsx` بهش Route بده → لینکش تو `DashboardSidebar.jsx`.
- **اضافه کردن API جدید**: یه فایل تو `api/` بساز (سبک همین فایل‌های موجود) و از `_admin.js` برای دسترسی به Supabase استفاده کن.
- **تغییر ظاهر کلی**: `src/index.css` و `tailwind.config.js`.
