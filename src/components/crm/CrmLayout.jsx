import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import CrmHeader from "@/components/crm/CrmHeader";
import DashboardSidebar from "@/components/crm/DashboardSidebar";

export default function CrmLayout() {
  const [dashboardOpen, setDashboardOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-background">
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
