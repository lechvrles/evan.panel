import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const { employee } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!employee) {
      setUnreadCount(0);
      return;
    }
    const { data, error } = await supabase.rpc("unread_notifications_count");
    setUnreadCount(error ? 0 : data || 0);
  }, [employee]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
