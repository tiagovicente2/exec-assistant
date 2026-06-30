import { useEffect, useMemo, useState } from "react";
import "./styles.css";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  target_date: string | null;
};

type Reminder = {
  id: string;
  message: string;
  remind_at: string;
  source?: string;
};

type CalendarEvent = {
  id?: string;
  summary?: string;
  calendarTitle?: string;
  startValue?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type Task = {
  id?: string;
  path?: string;
  title?: string;
  due?: string;
  status?: string;
  completed?: string | boolean;
  listTitle?: string;
};

type TaskList = {
  id?: string;
  title: string;
  tasks: Task[];
};

type MemoryHighlight = {
  id?: string;
  kind?: string;
  content?: string;
  title?: string;
};

type AiOverview = {
  summary?: string;
  highlights?: string[];
  improvements?: string[];
  continue?: string[];
  updatedAt?: string | null;
};

type DashboardData = {
  date: string;
  timezone: string;
  google: { connected: boolean; error: string | null; source?: string; syncedAt?: string | null };
  highlights: string[];
  goals: Goal[];
  aiOverview?: AiOverview;
  reminders: Reminder[];
  memories: MemoryHighlight[];
  calendars?: { id?: string; title: string; events: CalendarEvent[] }[];
  calendarEvents: CalendarEvent[];
  taskLists?: TaskList[];
  tasks: Task[];
  stats?: { goalAverageProgress?: number; openTaskCount?: number; dueTodayTaskCount?: number; overdueTaskCount?: number };
  notes?: string | null;
};

function storedToken() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("token")) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return localStorage.getItem("exec-dashboard-token") ?? "";
}

function formatTime(value?: string) {
  if (!value) return "Any time";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function longDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function eventStart(event: CalendarEvent) {
  return event.startValue ?? event.start?.dateTime ?? event.start?.date;
}

function SectionCard({ title, meta, icon, action, children, className = "" }: {
  title: string;
  meta?: string;
  icon?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-surface ${className}`}>
      <header className="section-header">
        <div className="section-title">
          {icon && <span className="section-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>
        <div className="section-meta-wrap">
          {meta && <span className="section-meta">{meta}</span>}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

function Login({ error, onToken }: { error: string | null; onToken: (value: string) => void }) {
  return (
    <main className="login-shell">
      <section className="login-card card-surface">
        <p className="eyebrow">Hermes Assistant</p>
        <h1>Dashboard access</h1>
        <p>Paste your dashboard token to view goals, calendar, tasks, reminders, and the AI overview.</p>
        {error && <div className="notice error">{error}</div>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onToken(String(form.get("token") ?? "").trim());
          }}
        >
          <input name="token" type="password" placeholder="Dashboard token" />
          <button>Open dashboard</button>
        </form>
      </section>
    </main>
  );
}

function Hero({ data, selectedDate, loading, onDate, onSyncInfo }: {
  data: DashboardData | null;
  selectedDate: string;
  loading: boolean;
  onDate: (value: string) => void;
  onSyncInfo: () => void;
}) {
  return (
    <header className="hero-surface">
      <div className="hero-glow" />
      <div className="hero-topline">
        <span className="eyebrow">Hermes Assistant</span>
        <button className="sync-pill" onClick={onSyncInfo} type="button">
          <span />
          {data?.google.syncedAt ? `Synced ${formatTime(data.google.syncedAt)}` : "Waiting for sync"}
        </button>
      </div>
      <div className="hero-content">
        <div>
          <h1>Daily Briefing</h1>
          <div className="date-row">
            <label className="date-picker">
              <span>📅</span>
              <input type="date" value={selectedDate} onChange={(event) => onDate(event.target.value)} />
              <strong>{longDate(selectedDate)}</strong>
            </label>
            <span className="timezone">{data?.timezone ?? "America/Sao_Paulo"}</span>
            <span className="date-chip">{formatDate(selectedDate)}</span>
          </div>
        </div>
        <nav className="hero-actions" aria-label="Date navigation">
          <div className="hero-action-row">
            <button disabled={loading} onClick={() => onDate(shiftDate(selectedDate, -1))}>‹ Yesterday</button>
            <button disabled={loading} onClick={() => onDate(isoDate())}>Today</button>
          </div>
          <button className="next-day" disabled={loading} onClick={() => onDate(shiftDate(selectedDate, 1))}>Next day ›</button>
        </nav>
      </div>
    </header>
  );
}

function AIOverview({ overview, syncedAt }: { overview?: AiOverview; syncedAt?: string | null }) {
  const blocks = [
    { key: "highlights", label: "Highlights", icon: "✦", items: overview?.highlights ?? [], className: "tone-highlight" },
    { key: "improve", label: "Improve", icon: "↗", items: overview?.improvements ?? [], className: "tone-improve" },
    { key: "continue", label: "Continue", icon: "♙", items: overview?.continue ?? [], className: "tone-continue" }
  ];
  return (
    <SectionCard title="AI overview" icon="✨" meta={overview?.updatedAt ? `updated ${formatTime(overview.updatedAt)}` : syncedAt ? `updated ${formatTime(syncedAt)}` : "waiting for sync"} className="ai-overview">
      <p className="ai-summary">{overview?.summary ?? "Hermes will generate an overview after the next dashboard snapshot sync."}</p>
      <div className="ai-grid">
        {blocks.map((block) => (
          <article className="ai-block" key={block.key}>
            <h3 className={block.className}><span>{block.icon}</span>{block.label}</h3>
            {block.items.length > 0 ? (
              <ul>{block.items.map((item) => <li key={item}>• {item}</li>)}</ul>
            ) : (
              <p className="muted">No items yet.</p>
            )}
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function GoalsProgress({ goals, average }: { goals: Goal[]; average?: number }) {
  const avg = average ?? (goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0);
  return (
    <SectionCard title="Goals Progress" icon="◎" meta={`${goals.length} active · ${avg}% avg`}>
      <div className="goals-layout">
        <div className="goal-ring" style={{ background: `conic-gradient(var(--chart-1) ${avg * 3.6}deg, var(--muted) 0deg)` }}>
          <div><strong>{avg}%</strong><span>overall</span></div>
        </div>
        <ul className="goal-bars">
          {goals.length === 0 && <li className="empty-line">No active goals yet.</li>}
          {goals.map((goal, index) => (
            <li key={goal.id}>
              <div className="bar-label"><span>{goal.title}</span><strong>{goal.progress}%</strong></div>
              <div className="bar"><span style={{ width: `${goal.progress}%`, backgroundColor: `var(--chart-${(index % 5) + 1})` }} /></div>
              {goal.target_date && <small>Target: {formatDate(goal.target_date)}</small>}
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

function DailyTodo({ data }: { data: DashboardData }) {
  const due = data.stats?.dueTodayTaskCount ?? data.tasks.filter((task) => task.due?.slice(0, 10) === data.date).length;
  const overdue = data.stats?.overdueTaskCount ?? 0;
  const open = data.stats?.openTaskCount ?? data.tasks.length;
  const adherence = open === 0 ? 100 : Math.max(10, Math.min(92, Math.round(((open - overdue) / open) * 100)));
  const levels = Array.from({ length: 49 }, (_, index) => (index * 7 + open + due + overdue) % 5);
  return (
    <SectionCard title="Daily Todo" icon="♨" meta={`${adherence}% · ${due} due today`}>
      <div className="todo-layout">
        <div>
          <div className="heatmap">{levels.map((level, index) => <span key={index} data-level={level} />)}</div>
          <div className="heatmap-legend"><span>less</span><i data-level="1" /><i data-level="2" /><i data-level="3" /><i data-level="4" /><span>more</span></div>
        </div>
        <div className="todo-stats">
          <strong>{open}</strong><span>open tasks</span>
          <strong>{overdue}</strong><span>overdue</span>
        </div>
      </div>
    </SectionCard>
  );
}

function CalendarList({ date, events }: { date: string; events: CalendarEvent[] }) {
  return (
    <SectionCard title="Calendar" icon="📅" meta={formatDate(date)}>
      <ul className="line-list">
        {events.length === 0 && <li className="empty-line">No events found for this day.</li>}
        {events.map((event, index) => (
          <li key={event.id ?? `${event.summary}-${index}`}>
            <time>{formatTime(eventStart(event))}</time>
            <span>{event.summary ?? "Untitled event"}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function TasksList({ lists, tasks, loading, onAction }: {
  lists: TaskList[];
  tasks: Task[];
  loading: boolean;
  onAction: (action: "done" | "remove", task: Task) => void;
}) {
  const normalizedLists = useMemo(() => lists.length ? lists : [{ title: "Tasks", tasks }], [lists, tasks]);
  const [activeListIndex, setActiveListIndex] = useState(0);
  const activeList = normalizedLists[Math.min(activeListIndex, normalizedLists.length - 1)] ?? normalizedLists[0];
  const open = activeList?.tasks.filter((task) => !task.completed).length ?? 0;

  useEffect(() => {
    if (activeListIndex >= normalizedLists.length) setActiveListIndex(0);
  }, [activeListIndex, normalizedLists.length]);

  return (
    <SectionCard
      title="Tasks"
      meta={`${open} open`}
      action={(
        <select value={activeListIndex} onChange={(event) => setActiveListIndex(Number(event.target.value))}>
          {normalizedLists.map((list, index) => <option key={list.id ?? list.title} value={index}>{list.title}</option>)}
        </select>
      )}
    >
      <ul className="task-list">
        {!activeList || activeList.tasks.length === 0 ? <li className="empty-line">No tasks in this list.</li> : null}
        {activeList?.tasks.map((task) => (
          <li key={task.id ?? task.path ?? task.title}>
            <div>
              <strong>{task.title ?? "Untitled task"}</strong>
              {task.due && <small>{formatDate(task.due)}</small>}
            </div>
            <div className="row-actions">
              <button disabled={loading} onClick={() => onAction("done", task)}>Done</button>
              <button className="ghost" disabled={loading} onClick={() => onAction("remove", task)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Reminders({ reminders, loading, onAction }: { reminders: Reminder[]; loading: boolean; onAction: (action: "done" | "remove", reminder: Reminder) => void }) {
  return (
    <SectionCard title="Reminders" icon="◷" meta={`${reminders.length} due`}>
      <ul className="task-list">
        {reminders.length === 0 && <li className="empty-line">No reminders due by this day.</li>}
        {reminders.map((reminder) => (
          <li key={reminder.id}>
            <div><strong>{reminder.message}</strong><small>{formatTime(reminder.remind_at)}</small></div>
            <div className="row-actions">
              <button disabled={loading} onClick={() => onAction("done", reminder)}>Done</button>
              <button className="ghost" disabled={loading} onClick={() => onAction("remove", reminder)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function SyncInfoModal({ data, onClose }: { data: DashboardData | null; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="sync-modal card-surface" onClick={(event) => event.stopPropagation()}>
        <header><h3>Sync info</h3><button onClick={onClose}>×</button></header>
        <dl>
          <div><dt>Last sync</dt><dd>{data?.google.syncedAt ? new Date(data.google.syncedAt).toLocaleString("pt-BR") : "Not synced"}</dd></div>
          <div><dt>Window</dt><dd>Selected dashboard date</dd></div>
          <div><dt>Timezone</dt><dd>{data?.timezone ?? "America/Sao_Paulo"}</dd></div>
          <div><dt>Calendar events</dt><dd>{data?.calendarEvents.length ?? 0}</dd></div>
          <div><dt>Open tasks</dt><dd>{data?.tasks.length ?? 0}</dd></div>
        </dl>
      </section>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(storedToken());
  const [selectedDate, setSelectedDate] = useState(isoDate());
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadDashboard(currentToken: string, date = selectedDate) {
    if (!currentToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      const response = await fetch(`/api/dashboard?${params.toString()}`, { headers: { "x-dashboard-token": currentToken } });
      if (response.status === 401) {
        localStorage.removeItem("exec-dashboard-token");
        setToken("");
        throw new Error("Invalid dashboard token. Paste the current token.");
      }
      if (!response.ok) throw new Error(await response.text());
      setData(await response.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(method: string, url: string, body?: unknown) {
    if (!token) return false;
    setLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "x-dashboard-token": token, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadDashboard(token, selectedDate);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
      setLoading(false);
      return false;
    }
  }

  async function queueItemAction(targetType: "task" | "reminder", action: "done" | "remove", item: Task | Reminder) {
    const title = "title" in item ? item.title : item.message;
    const ok = await runAction("POST", "/api/dashboard/actions", {
      targetType,
      action,
      targetId: item.id,
      targetPath: "path" in item ? item.path : undefined,
      title
    });
    if (ok) setActionNotice(`${targetType === "task" ? "Task" : "Reminder"} ${action === "done" ? "done" : "remove"} action queued.`);
  }

  useEffect(() => {
    if (!token) return;
    localStorage.setItem("exec-dashboard-token", token);
    void loadDashboard(token, selectedDate);
  }, [token, selectedDate]);

  if (!token) return <Login error={error} onToken={setToken} />;

  return (
    <main className="shell">
      <Hero data={data} selectedDate={selectedDate} loading={loading} onDate={setSelectedDate} onSyncInfo={() => setSyncOpen(true)} />

      {loading && <div className="notice">Loading dashboard...</div>}
      {actionNotice && <div className="notice success">{actionNotice}</div>}
      {error && <div className="notice error">{error}</div>}
      {data?.google.error && <div className="notice error">Google: {data.google.error}</div>}

      {data && (
        <>
          <AIOverview overview={data.aiOverview} syncedAt={data.google.syncedAt} />
          {data.notes && <div className="notice">{data.notes}</div>}

          <section className="grid two-cols">
            <GoalsProgress goals={data.goals} average={data.stats?.goalAverageProgress} />
            <DailyTodo data={data} />
          </section>

          <section className="grid two-cols">
            <CalendarList date={data.date} events={data.calendarEvents} />
            <TasksList lists={data.taskLists ?? []} tasks={data.tasks} loading={loading} onAction={(action, task) => void queueItemAction("task", action, task)} />
          </section>

          <section className="grid two-cols">
            <Reminders reminders={data.reminders} loading={loading} onAction={(action, reminder) => void queueItemAction("reminder", action, reminder)} />
            <SectionCard title="Memory Highlights" icon="◇" meta={`${data.memories.length} saved`}>
              <ul className="line-list memory-list">
                {data.memories.length === 0 && <li className="empty-line">No memory highlights synced.</li>}
                {data.memories.map((memory, index) => (
                  <li key={memory.id ?? `${memory.kind ?? "memory"}-${index}`}>
                    <span>{memory.content ?? memory.title ?? "Memory highlight"}</span>
                    {memory.kind && <small>{memory.kind}</small>}
                  </li>
                ))}
              </ul>
            </SectionCard>
          </section>
        </>
      )}

      {syncOpen && <SyncInfoModal data={data} onClose={() => setSyncOpen(false)} />}
    </main>
  );
}

export default App;
