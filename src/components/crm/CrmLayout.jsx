import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import CrmHeader from "@/components/crm/CrmHeader";
import DashboardSidebar from "@/components/crm/DashboardSidebar";
import { cn } from "@/lib/utils";

export default function CrmLayout() {
  const [dashboardOpen, setDashboardOpen] = useState(true);

  // جلوگیری از اسکرول پشت صفحه وقتی سایدبار موبایل بازه
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    document.body.style.overflow = isMobile && dashboardOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [dashboardOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* بک‌دراپ: فقط موبایل، پشت سایدبار و روی محتوای اصلی، با فید+بلور */}
      <div
        onClick={() => setDashboardOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          dashboardOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      <DashboardSidebar open={dashboardOpen} onClose={() => setDashboardOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <CrmHeader
          dashboardOpen={dashboardOpen}
          onToggleDashboard={() => setDashboardOpen((v) => !v)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
