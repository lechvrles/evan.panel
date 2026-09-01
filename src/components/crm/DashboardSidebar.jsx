import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  Users,
  PanelRight,
  ChevronUp,
  Settings,
  LogOut,
  User as UserIcon,
  List as ListIcon,
  UserPlus,
  LayoutGrid,
  ChevronDown,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const LOGO = "https://evantechco.com/wp-content/uploads/2022/05/logo.webp";

const baseNavStructure = [
  {
    type: "section",
    label: "اصلی",
    icon: LayoutGrid,
    items: [{ to: "/", label: "خانه", icon: HomeIcon, end: true }],
  },
  {
    type: "section",
    label: "مشتری‌ها",
    icon: Users,
    items: [
      { to: "/customers", label: "لیست مشتریان", icon: ListIcon, end: true },
      { to: "/customers/register", label: "ثبت مشتری", icon: UserPlus },
    ],
  },
];

function isPathActive(to, end, pathname) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

export default function DashboardSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { employee: current, logout } = useAuth();
  const location = useLocation();
  const navStructure = [
    ...baseNavStructure,
    ...(current?.role === "admin"
      ? [
          {
            type: "section",
            label: "مدیریت",
            icon: ShieldCheck,
            items: [
              { to: "/employees", label: "مدیریت کارمندان", icon: UserPlus, end: true },
            ],
          },
        ]
      : []),
  ];

  const [expanded, setExpanded] = useState(() => {
    const set = new Set();
    navStructure.forEach((entry, i) => {
      if (
        entry.type === "section" &&
        entry.items.some((it) => isPathActive(it.to, it.end, location.pathname))
      ) {
        set.add(i);
      }
    });
    return set;
  });

  const toggleSection = (idx) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const linkClass = (isActive) =>
    cn(
      "flex items-center gap-3 h-11 rounded-2xl text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-foreground/70 hover:bg-accent hover:text-foreground"
    );

  return (
    <aside
      className={cn(
        "shrink-0 h-dvh overflow-hidden",
        "fixed top-0 right-0 z-50 w-72 transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full",
        "md:sticky md:top-0 md:translate-x-0 md:transition-[width] md:duration-300",
        open ? "md:w-64" : "md:w-0"
      )}
    >
      <div className="w-72 md:w-64 h-full flex flex-col bg-card border-l border-border">
        {/* هدر داشبورد (۵۲px) — لوگو + دکمه بستن */}
        <div className="flex items-center justify-between px-4 h-[52px] border-b border-border shrink-0">
          <img src={LOGO} alt="EVAN" className="h-[35px] w-auto" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent grid place-items-center text-muted-foreground transition-colors"
            aria-label="بستن داشبورد"
          >
            <PanelRight className="w-[18px] h-[18px]" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navStructure.map((entry, idx) => {
            if (entry.type === "link") {
              const Icon = entry.icon;
              return (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  end={entry.end}
                  className={({ isActive }) => cn(linkClass(isActive), "px-3.5")}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {entry.label}
                </NavLink>
              );
            }
            const SectionIcon = entry.icon;
            const isOpen = expanded.has(idx);
            return (
              <div key={entry.label}>
                <button
                  type="button"
                  onClick={() => toggleSection(idx)}
                  className="flex items-center gap-3 w-full px-3.5 h-11 rounded-2xl text-sm font-semibold text-foreground/70 hover:bg-accent transition-colors"
                >
                  <SectionIcon className="w-[18px] h-[18px]" />
                  <span className="flex-1 text-right">{entry.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all",
                    isOpen ? "max-h-96 mt-1 space-y-0.5" : "max-h-0"
                  )}
                >
                  {entry.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(linkClass(isActive), "pr-9 pl-3.5")
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* کارت پروفایل کارمند — چسبیده به پایین داشبورد */}
        <div className="border-t border-border p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-colors text-right">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary grid place-items-center text-primary-foreground shrink-0">
                  {current?.avatar_url ? (
                    <Image
                      src={current.avatar_url}
                      alt="پروفایل"
                      fittingType="fill"
                      className="w-full h-full"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {current?.full_name || "کارمند"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {current?.position || (current?.role ? roleLabel(current.role) : current?.username)}
                  </p>
                </div>
                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <Settings className="w-4 h-4" />
                تنظیمات
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
