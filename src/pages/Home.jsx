import React from "react";
import { useAuth } from "@/lib/AuthContext";
import HomeCustomerList from "@/components/crm/HomeCustomerList";

export default function Home() {
  const { employee } = useAuth();
  const name = (employee?.full_name || "کاربر").split(" ")[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
          {name} عزیز
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          به صفحه اصلی پنل اِوان خوش آمدید.
        </p>
      </div>
      <HomeCustomerList />
    </div>
  );
}
