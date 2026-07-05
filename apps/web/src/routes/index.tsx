import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GitPullRequest,
  Inbox,
  ListChecks,
  Search,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const briefItems = [
  { label: "Today's priorities", value: "3", detail: "Focus on key outcomes", icon: Target },
  { label: "Upcoming meetings", value: "4", detail: "Next meeting in 1h 15m", icon: CalendarClock },
  { label: "Attention required", value: "5", detail: "High-impact items", icon: CircleAlert },
  { label: "Waiting for you", value: "3", detail: "Updates and approvals", icon: Clock3 },
  { label: "Completed yesterday", value: "7", detail: "Closed loops", icon: CheckCircle2 },
];

const activityItems = [
  { time: "8:15", title: "Team Standup", detail: "Engineering Team", status: "Meeting" },
  { time: "9:05", title: "Expense Report Approved", detail: "$1,248.75 · May 2025", status: "Complete" },
  { time: "9:42", title: "Q2 Planning Deck Updated", detail: "Strategy / Q2 Planning Deck", status: "Updated" },
  { time: "10:30", title: "Customer Call", detail: "Acme Corp · Renewal discussion", status: "Meeting" },
  { time: "11:12", title: "Vendor Contract Review", detail: "BrightComms · Due May 18", status: "Action" },
];

const attentionItems = [
  { title: "Review & approve budget", detail: "Requested by Finance Team", priority: "High" },
  { title: "Investor update draft", detail: "Requested by IR Team", priority: "High" },
  { title: "Vendor contract renewal", detail: "BrightComms · Expires May 20", priority: "Medium" },
  { title: "1:1 follow-up", detail: "Performance discussion", priority: "Medium" },
];

const commands = ["Summarize my day", "Reschedule conflicts", "Draft investor update"];

function HomePage() {
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="operator-panel flex flex-col gap-6 p-5">
            <div>
              <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Zap className="size-5" />
              </div>
              <p className="text-sm font-medium text-primary">Personal operator</p>
              <h1 className="mt-2 text-[44px] font-semibold leading-[46px] tracking-normal text-foreground sm:text-[52px] sm:leading-[54px]">
                Kabeer OS
              </h1>
              <p className="mt-4 max-w-sm text-base leading-7 text-muted-foreground">
                A compact command center for attention, activity, and assistant-driven action.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Launch dashboard
              <ArrowRight className="size-4" />
            </Link>

            <div className="border-t border-border pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Today at a glance
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Metric value="14" label="Signals" />
                <Metric value="5" label="Needs review" />
                <Metric value="30s" label="Brief" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)_minmax(300px,0.9fr)]">
            <aside className="operator-panel p-5">
              <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Morning Brief</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Friday, May 16</p>
                </div>
                <button className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Brief filters">
                  <ListChecks className="size-4" />
                </button>
              </div>

              <div className="py-5">
                <p className="text-base font-semibold text-foreground">Good morning, Kabeer.</p>
                <p className="mt-1 text-sm text-muted-foreground">Here's what's happening today.</p>
              </div>

              <ul className="flex flex-col divide-y divide-border">
                {briefItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.label} className="flex items-center gap-3 py-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                      </span>
                      <span className="text-sm font-semibold text-foreground">{item.value}</span>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className="operator-panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Activity</h2>
                  <p className="text-sm text-muted-foreground">Today · live signal stream</p>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:border-primary/50" aria-label="Filter activity">
                  <Search className="size-4 text-muted-foreground" />
                  Filter
                </button>
              </div>

              <div className="divide-y divide-border">
                {activityItems.map((item, index) => (
                  <div key={`${item.time}-${item.title}`} className="grid grid-cols-[56px_28px_minmax(0,1fr)_auto] items-start gap-3 px-5 py-4">
                    <span className="pt-1 text-sm text-muted-foreground">{item.time}</span>
                    <span className="relative flex size-7 items-center justify-center rounded-full bg-signal-blue-soft text-signal-blue">
                      <span className="size-2 rounded-full bg-current" />
                      {index !== activityItems.length - 1 ? (
                        <span className="absolute left-1/2 top-7 h-10 w-px -translate-x-1/2 bg-border" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">{item.detail}</span>
                    </span>
                    <StatusChip label={item.status} />
                  </div>
                ))}
              </div>
            </section>

            <aside className="operator-panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Attention</h2>
                  <p className="text-sm text-muted-foreground">Review queue</p>
                </div>
                <span className="status-chip border-primary/25 bg-primary/10 text-primary">5 open</span>
              </div>

              <ul className="divide-y divide-border">
                {attentionItems.map((item) => (
                  <li key={item.title} className="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 p-5">
                    <span className="flex size-9 items-center justify-center rounded-md bg-signal-amber-soft text-primary">
                      <Inbox className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">{item.detail}</span>
                    </span>
                    <span
                      className={
                        item.priority === "High"
                          ? "status-chip border-signal-red/20 bg-signal-red-soft text-signal-red"
                          : "status-chip border-signal-amber/20 bg-signal-amber-soft text-signal-amber"
                      }
                    >
                      {item.priority}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="operator-panel p-4">
          <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bot className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Assistant</p>
                <p className="text-xs text-muted-foreground">Ready to help</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground">
                <GitPullRequest className="size-4" />
                Ask anything or give a command...
              </div>
              <div className="flex flex-wrap gap-2">
                {commands.map((command) => (
                  <button
                    key={command}
                    className="h-11 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:border-primary/50"
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusChip({ label }: { label: string }) {
  const className =
    label === "Complete"
      ? "border-signal-green/20 bg-signal-green-soft text-signal-green"
      : label === "Action"
        ? "border-signal-amber/20 bg-signal-amber-soft text-signal-amber"
        : label === "Updated"
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-signal-blue/20 bg-signal-blue-soft text-signal-blue";

  return <span className={`status-chip ${className}`}>{label}</span>;
}
