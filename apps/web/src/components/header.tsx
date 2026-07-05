import { Link } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Calendar,
  Command,
  Grid2X2,
  Menu,
  Search,
  Settings,
  UsersRound,
  Zap,
} from "lucide-react";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const navItems = [
    { label: "Operator", icon: Grid2X2, isActive: true },
    { label: "Calendar", icon: Calendar },
    { label: "People", icon: UsersRound },
    { label: "Knowledge", icon: BookOpen },
    { label: "Automations", icon: Zap },
    { label: "Settings", icon: Settings },
  ];

  return (
    <header className="w-full max-w-full overflow-x-hidden border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-14 min-w-0 items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
          <Link to="/" className="min-w-0 truncate text-[21px] font-semibold leading-none tracking-normal">
            Kabeer OS
          </Link>
        </div>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-3 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                to={item.label === "Operator" ? "/dashboard" : "/"}
                className={
                  item.isActive
                    ? "inline-flex h-14 items-center gap-2 border-b-2 border-primary px-3 text-sm font-medium text-primary"
                    : "inline-flex h-14 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                }
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground sm:inline-flex"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <button
            className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground sm:inline-flex"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>
          <ModeToggle />
          <Link
            to="/dashboard"
            className="hidden h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-foreground transition hover:border-primary/50 sm:inline-flex"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
              K
            </span>
            <span>Kabeer</span>
            <Command className="size-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>

      <nav className="flex w-full max-w-full min-w-0 items-center gap-1 overflow-x-auto border-t border-border px-3 lg:hidden">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.label === "Operator" ? "/dashboard" : "/"}
              className={
                item.isActive
                  ? "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-primary px-2 text-sm font-medium text-primary"
                  : "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-2 text-sm font-medium text-muted-foreground"
              }
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
