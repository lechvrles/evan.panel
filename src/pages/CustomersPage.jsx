import React from "react";
import CustomerList from "@/components/crm/CustomerList";

export default function CustomersPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
          لیست مشتریان
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          همه مشتریان خود را در اینجا مشاهده و مدیریت کنید.
        </p>
      </div>

      <CustomerList />
    </div>
  );
}
