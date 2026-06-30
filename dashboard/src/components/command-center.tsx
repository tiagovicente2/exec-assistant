import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Flame,
  Info,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  target_date: string | null;
};

export type Reminder = {
  id: string;
  message: string;
  remind_at: string;
};

export type CalendarEvent = {
  id?: string;
  summary?: string;
  calendarTitle?: string;
  startValue?: string;
  start?: { dateTime?: string; date?: string };
};

export type Task = {
  id?: string;
  path?: string;
  title?: string;
  due?: string;
  completed?: string | boolean;
  listTitle?: string;
};

export type TaskList = {
  id?: string;
  title: string;
  tasks: Task[];
};

export type AiOverview = {
  summary?: string;
  highlights?: string[];
  improvements?: string[];
  continue?: string[];
  updatedAt?: string | null;
};

export type DashboardData = {
  date: string;
  timezone: string;
  google: { connected: boolean; error: string | null; syncedAt?: string | null };
  goals: Goal[];
  aiOverview?: AiOverview;
  reminders: Reminder[];
  memories: { id?: string; kind?: string; content?: string; title?: string }[];
  calendarEvents: CalendarEvent[];
  taskLists?: TaskList[];
  tasks: Task[];
  stats?: { goalAverageProgress?: number; openTaskCount?: number; overdueTaskCount?: number; dueTodayTaskCount?: number };
  notes?: string | null;
};

type Action = "done" | "remove";

type CommandCenterProps = {
  data: DashboardData | null;
  selectedDate: string;
  loading: boolean;
  error: string | null;
  notice: string | null;
  onDateChange: (date: string) => void;
  onGoalComplete: (goal: Goal) => void;
  onTaskAction: (action: Action, task: Task) => void;
  onReminderAction: (action: Action, reminder: Reminder) => void;
};

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTime(value?: string | null) {
  if (!value) return "Any time";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function eventStart(event: CalendarEvent) {
  return event.startValue ?? event.start?.dateTime ?? event.start?.date;
}

function SectionCard({
  title,
  meta,
  icon,
  children,
  className = "",
  action,
}: {
  title: string;
  meta?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`card-surface p-6 ${className}`}>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {meta && <span className="text-xs font-medium text-muted-foreground">{meta}</span>}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

function AIOverview({ overview, syncedAt }: { overview?: AiOverview; syncedAt?: string | null }) {
  const blocks = [
    { key: "highlights", label: "Highlights", icon: <Sparkles size={14} />, items: overview?.highlights ?? [], tone: "var(--chart-1)" },
    { key: "improve", label: "Improve", icon: <TrendingUp size={14} />, items: overview?.improvements ?? [], tone: "var(--chart-2)" },
    { key: "continue", label: "Continue", icon: <Lightbulb size={14} />, items: overview?.continue ?? [], tone: "var(--chart-3)" },
  ];
  return (
    <SectionCard title="AI overview" icon={<Sparkles size={18} />} meta={overview?.updatedAt ? `updated ${formatTime(overview.updatedAt)}` : syncedAt ? `updated ${formatTime(syncedAt)}` : "waiting for sync"}>
      <p className="mb-5 text-sm leading-relaxed text-foreground/80">
        {overview?.summary ?? "Hermes will generate an overview after the next dashboard snapshot sync."}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {blocks.map((b) => (
          <div key={b.key} className="rounded-2xl bg-secondary/60 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: b.tone }}>
              {b.icon} {b.label}
            </div>
            {b.items.length > 0 ? (
              <ul className="space-y-1.5">
                {b.items.map((t) => (
                  <li key={t} className="text-sm leading-snug text-foreground/85">• {t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function GoalsProgress({ goals, average, loading, onComplete }: { goals: Goal[]; average?: number; loading: boolean; onComplete: (goal: Goal) => void }) {
  const overallGoal = average ?? (goals.length > 0 ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0);
  return (
    <SectionCard title="Goals Progress" meta={`${goals.length} active · ${overallGoal}% avg`} icon={<Target size={18} />}>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart data={[{ name: "overall", value: overallGoal, fill: "var(--chart-1)" }]} innerRadius="75%" outerRadius="100%" startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "var(--muted)" }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-4xl font-bold text-foreground">{overallGoal}%</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">overall</div>
          </div>
        </div>
        <ul className="space-y-3.5">
          {goals.length === 0 && <li className="py-6 text-sm text-muted-foreground">No active goals yet.</li>}
          {goals.map((goal, index) => (
            <li key={goal.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-foreground">{goal.title}</span>
                <span className="text-xs font-semibold text-muted-foreground">{goal.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${goal.progress}%`, backgroundColor: `var(--chart-${(index % 5) + 1})` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                {goal.target_date ? <span className="text-xs text-muted-foreground">Target: {formatDate(goal.target_date)}</span> : <span />}
                <button disabled={loading} onClick={() => onComplete(goal)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-secondary">Complete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

function DailyTodo({ data }: { data: DashboardData }) {
  const open = data.stats?.openTaskCount ?? data.tasks.length;
  const overdue = data.stats?.overdueTaskCount ?? 0;
  const dueToday = data.stats?.dueTodayTaskCount ?? 0;
  const adherence = open === 0 ? 100 : Math.max(10, Math.min(96, Math.round(((open - overdue) / open) * 100)));
  const heatmap = Array.from({ length: 7 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => (w * 7 + d + open + dueToday + overdue) % 5),
  );
  const levels = [
    "var(--muted)",
    "color-mix(in oklch, var(--chart-1) 25%, var(--muted))",
    "color-mix(in oklch, var(--chart-1) 50%, var(--muted))",
    "color-mix(in oklch, var(--chart-1) 75%, var(--muted))",
    "var(--chart-1)",
  ];
  return (
    <SectionCard title="Daily Todo" meta={`${adherence}% · ${dueToday} due today`} icon={<Flame size={18} />}>
      <div className="flex items-end gap-6">
        <div>
          <div className="grid grid-flow-col grid-rows-7 gap-1.5">
            {heatmap.flatMap((week, wi) =>
              week.map((lvl, di) => <div key={`${wi}-${di}`} className="h-4 w-4 rounded-[4px]" style={{ backgroundColor: levels[lvl] }} />),
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>less</span>
            {levels.map((c, i) => <span key={i} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: c }} />)}
            <span>more</span>
          </div>
        </div>
        <div className="ml-auto space-y-3 text-right">
          <div>
            <div className="font-display text-4xl font-bold text-foreground">{open}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">open tasks</div>
          </div>
          <div>
            <div className="font-display text-2xl font-semibold text-foreground">{overdue}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">overdue</div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function CalendarList({ date, events }: { date: string; events: CalendarEvent[] }) {
  return (
    <SectionCard title="Calendar" meta={formatDate(date)} icon={<CalendarIcon size={18} />}>
      <ul className="divide-y divide-border">
        {events.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No events found for this day.</li>}
        {events.map((event, index) => (
          <li key={event.id ?? `${event.summary}-${index}`} className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm tabular-nums text-muted-foreground">{formatTime(eventStart(event))}</span>
            <span className="text-right text-sm font-medium text-foreground">{event.summary ?? "Untitled event"}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function TasksList({ lists, tasks, loading, onAction }: { lists: TaskList[]; tasks: Task[]; loading: boolean; onAction: (action: Action, task: Task) => void }) {
  const normalizedLists = useMemo(() => (lists.length > 0 ? lists : [{ title: "Tasks", tasks }]), [lists, tasks]);
  const [activeListId, setActiveListId] = useState(normalizedLists[0]?.id ?? normalizedLists[0]?.title ?? "tasks");
  const activeList = normalizedLists.find((l) => (l.id ?? l.title) === activeListId) ?? normalizedLists[0];
  const open = activeList?.tasks.filter((t) => !t.completed).length ?? 0;
  const selector = (
    <select value={activeListId} onChange={(e) => setActiveListId(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
      {normalizedLists.map((l) => <option key={l.id ?? l.title} value={l.id ?? l.title}>{l.title}</option>)}
    </select>
  );
  return (
    <SectionCard title="Tasks" meta={`${open} open`} action={selector}>
      <ul className="divide-y divide-border">
        {!activeList || activeList.tasks.length === 0 ? <li className="py-6 text-center text-sm text-muted-foreground">No tasks in this list.</li> : null}
        {activeList?.tasks.map((task) => (
          <li key={task.id ?? task.path ?? task.title} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{task.title ?? "Untitled task"}</div>
              {task.due && <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(task.due)}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={loading} onClick={() => onAction("done", task)} className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground transition hover:opacity-90">Done</button>
              <button disabled={loading} onClick={() => onAction("remove", task)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-secondary">Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function RemindersList({ reminders, loading, onAction }: { reminders: Reminder[]; loading: boolean; onAction: (action: Action, reminder: Reminder) => void }) {
  return (
    <SectionCard title="Reminders" meta={`${reminders.length} due`}>
      <ul className="divide-y divide-border">
        {reminders.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No reminders due by this day.</li>}
        {reminders.map((reminder) => (
          <li key={reminder.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{reminder.message}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{formatTime(reminder.remind_at)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={loading} onClick={() => onAction("done", reminder)} className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground transition hover:opacity-90">Done</button>
              <button disabled={loading} onClick={() => onAction("remove", reminder)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-secondary">Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function MemoryList({ memories }: { memories: DashboardData["memories"] }) {
  return (
    <SectionCard title="Memory Highlights" meta={`${memories.length} saved`}>
      <ul className="divide-y divide-border">
        {memories.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No memory highlights synced.</li>}
        {memories.map((memory, index) => (
          <li key={memory.id ?? `${memory.kind ?? "memory"}-${index}`} className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm font-medium text-foreground">{memory.content ?? memory.title ?? "Memory highlight"}</span>
            {memory.kind && <span className="text-xs text-muted-foreground">{memory.kind}</span>}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function SyncInfoModal({ data, open, onClose }: { data: DashboardData | null; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="card-surface w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2"><span className="text-primary"><Info size={18} /></span><h3 className="text-base font-semibold text-foreground">Sync info</h3></div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-secondary"><X size={16} /></button>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Last sync</dt><dd className="font-medium text-foreground">{data?.google.syncedAt ? new Date(data.google.syncedAt).toLocaleString("pt-BR") : "Not synced"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Window</dt><dd className="font-medium text-foreground">Selected day</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Timezone</dt><dd className="font-medium text-foreground">{data?.timezone ?? "America/Sao_Paulo"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Events</dt><dd className="font-medium text-foreground">{data?.calendarEvents.length ?? 0}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Open tasks</dt><dd className="font-medium text-foreground">{data?.tasks.length ?? 0}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function Hero({ date, timezone, syncedAt, onPrev, onToday, onNext, onSyncInfo, onPickDate }: { date: Date; timezone?: string; syncedAt?: string | null; onPrev: () => void; onToday: () => void; onNext: () => void; onSyncInfo: () => void; onPickDate: (d: Date) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const longDate = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    <header className="hero-surface relative overflow-hidden rounded-[32px] p-7 shadow-2xl" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[color:var(--accent)]/15 blur-3xl" />
      <div className="relative mb-8 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--hero-foreground)]/55">Hermes Assistant</span>
          <button onClick={onSyncInfo} title="Sync info" className="flex items-center gap-1.5 rounded-full border border-[color:var(--hero-foreground)]/10 bg-[color:var(--hero-foreground)]/10 px-2.5 py-1 backdrop-blur transition hover:bg-[color:var(--hero-foreground)]/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
            <span className="text-[10px] font-medium text-[color:var(--hero-foreground)]/85">{syncedAt ? `Synced ${formatTime(syncedAt)}` : "Waiting for sync"}</span>
          </button>
        </div>
        <h1 className="pt-2 text-4xl font-semibold tracking-tight md:text-5xl" style={{ fontFamily: "'Lora', serif" }}>Daily Briefing</h1>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-[color:var(--hero-foreground)]/15 bg-[color:var(--hero-foreground)]/10 px-3 py-1.5 text-sm font-medium text-[color:var(--hero-foreground)] backdrop-blur transition hover:bg-[color:var(--hero-foreground)]/20" aria-label="Pick a date">
                <CalendarIcon size={14} className="opacity-70" />
                <span>{longDate}</span>
                <span className="text-[color:var(--hero-foreground)]/60">· {formatDate(toIsoDate(date))}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0 pointer-events-auto">
              <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { onPickDate(d); setPickerOpen(false); } }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-[11px] text-[color:var(--hero-foreground)]/55">{timezone ?? "America/Sao_Paulo"}</span>
        </div>
      </div>
      <div className="relative space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onPrev} className="flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--hero-foreground)]/10 bg-[color:var(--hero-foreground)]/5 px-4 py-3.5 text-sm font-medium transition hover:bg-[color:var(--hero-foreground)]/10"><ChevronRight size={16} className="rotate-180 opacity-60" />Yesterday</button>
          <button onClick={onToday} className="rounded-2xl border border-[color:var(--hero-foreground)]/10 bg-[color:var(--hero-foreground)]/5 px-4 py-3.5 text-sm font-medium transition hover:bg-[color:var(--hero-foreground)]/10">Today</button>
        </div>
        <button onClick={onNext} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground shadow-lg shadow-black/20 transition hover:opacity-95 active:scale-[0.98]">Next day<ChevronRight size={18} /></button>
      </div>
    </header>
  );
}

export function CommandCenter({ data, selectedDate, loading, error, notice, onDateChange, onGoalComplete, onTaskAction, onReminderAction }: CommandCenterProps) {
  const [syncOpen, setSyncOpen] = useState(false);
  const date = dateFromIso(selectedDate);
  const shift = (days: number) => onDateChange(toIsoDate(new Date(date.getTime() + days * 86400000)));

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-4 flex justify-end"><ThemeToggle /></div>
      <Hero date={date} timezone={data?.timezone} syncedAt={data?.google.syncedAt} onPrev={() => shift(-1)} onToday={() => onDateChange(isoDate())} onNext={() => shift(1)} onSyncInfo={() => setSyncOpen(true)} onPickDate={(d) => onDateChange(toIsoDate(d))} />

      {loading && <div className="mt-4 rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">Loading dashboard...</div>}
      {notice && <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">{notice}</div>}
      {error && <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {data?.google.error && <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">Google: {data.google.error}</div>}

      {data && (
        <>
          <div className="mt-6"><AIOverview overview={data.aiOverview} syncedAt={data.google.syncedAt} /></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2"><GoalsProgress goals={data.goals} average={data.stats?.goalAverageProgress} loading={loading} onComplete={onGoalComplete} /><DailyTodo data={data} /></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2"><CalendarList date={data.date} events={data.calendarEvents} /><TasksList lists={data.taskLists ?? []} tasks={data.tasks} loading={loading} onAction={onTaskAction} /></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2"><RemindersList reminders={data.reminders} loading={loading} onAction={onReminderAction} /><MemoryList memories={data.memories} /></div>
        </>
      )}

      <SyncInfoModal data={data} open={syncOpen} onClose={() => setSyncOpen(false)} />
    </main>
  );
}
