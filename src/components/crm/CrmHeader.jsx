import React, { useState } from "react";
import { PanelRight, Search, Bell, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO = "https://media.base44.com/images/public/6a869b2036726c8f4d4f7204/9b5e3dc2c_-6.png";

export default function CrmHeader({ dashboardOpen, onToggleDashboard }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-[52px]">
          {/* راست: آیکن داشبورد (طبق عکس: PanelRight) — باز می‌شود و در حالت باز محو */}
          <button
            onClick={onToggleDashboard}
            className={cn(
              "w-9 h-9 rounded-xl grid place-items-center transition-all duration-300 shrink-0 border border-border",
              dashboardOpen
                ? "opacity-0 pointer-events-none scale-90"
                : "bg-card text-foreground hover:bg-accent"
            )}
            aria-label="داشبورد"
          >
            <PanelRight className="w-[18px] h-[18px]" />
          </button>

          {/* وسط: در حالت بسته لوگو، در حالت باز جستجو */}
          <div className="flex-1 flex justify-center min-w-0">
            {dashboardOpen ? (
              <div className="relative w-full max-w-md">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="جستجوی مشتریان، سفارش‌ها…"
                  className="w-full h-9 pr-10 pl-3 rounded-full bg-accent/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            ) : (
              <img src={LOGO} alt="EVAN" className="h-8 w-auto" />
            )}
          </div>

          {/* چپ: پیام‌ها، اعلان‌ها، جستجو (فقط در حالت بسته) */}
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
            <button
              className="w-9 h-9 rounded-xl hover:bg-accent grid place-items-center transition-colors"
              aria-label="پیام‌ها"
            >
              <Mail className="w-[18px] h-[18px]" />
            </button>
            <button
              className="relative w-9 h-9 rounded-xl hover:bg-accent grid place-items-center transition-colors"
              aria-label="اعلان‌ها"
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
            </button>
            {!dashboardOpen && (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-xl hover:bg-accent grid place-items-center transition-colors"
                aria-label="جستجو"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* پنل جستجوی تاشو (فقط در حالت بسته) */}
      {searchOpen && !dashboardOpen && (
        <div className="fixed top-[52px] inset-x-0 bottom-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="absolute top-0 inset-x-0 mx-auto max-w-2xl px-4 pt-4">
            <div className="bg-card rounded-2xl shadow-2xl border border-border p-3">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  placeholder="جستجوی مشتریان، سفارش‌ها، محصولات…"
                  className="w-full h-12 pr-11 pl-10 rounded-xl bg-background border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-accent grid place-items-center text-muted-foreground"
                  aria-label="بستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
