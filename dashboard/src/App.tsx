import { useEffect, useState } from "react";
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
};

type MemoryHighlight = {
  id?: string;
  kind?: string;
  content?: string;
  title?: string;
};

type DashboardData = {
  date: string;
  timezone: string;
  google: { connected: boolean; error: string | null; source?: string; syncedAt?: string | null };
  highlights: string[];
  goals: Goal[];
  reminders: Reminder[];
  memories: MemoryHighlight[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
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

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function App() {
  const [token, setToken] = useState(storedToken());
  const [selectedDate, setSelectedDate] = useState(isoDate());
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
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

  if (!token) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Exec Assistant</p>
          <h1>Dashboard access</h1>
          <p>Paste your dashboard token to view goals, today's highlights, calendar, tasks, and reminders.</p>
          {error && <div className="notice error">{error}</div>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setToken(String(form.get("token") ?? "").trim());
            }}
          >
            <input name="token" type="password" placeholder="Dashboard token" />
            <button>Open dashboard</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Exec Assistant</p>
          <h1>Command center</h1>
          <p>{data ? `${data.date} · ${data.timezone}` : "Loading your day..."}</p>
        </div>
        <div className="date-controls">
          <input
            aria-label="Overview date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <button className="secondary" disabled={loading} onClick={() => setSelectedDate(isoDate())}>Today</button>
          <button className="secondary" disabled={loading} onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}>Next day</button>
        </div>
      </header>

      {loading && <div className="notice">Loading dashboard...</div>}
      {actionNotice && <div className="notice success">{actionNotice}</div>}
      {error && <div className="notice error">{error}</div>}
      {data?.google.error && <div className="notice error">Google: {data.google.error}</div>}

      {data && (
        <>
          <section className="highlights">
            {data.highlights.map((item) => (
              <article className="highlight" key={item}>{item}</article>
            ))}
          </section>

          {data.google.syncedAt && <div className="notice">Synced at {new Date(data.google.syncedAt).toLocaleString()}</div>}
          {data.notes && <div className="notice">{data.notes}</div>}

          <section className="grid">
            <article className="panel wide">
              <div className="panel-title">
                <h2>Goals Progress</h2>
                <span>{data.goals.length} active</span>
              </div>
              <div className="goal-list">
                {data.goals.length === 0 && <p className="muted">No active goals yet.</p>}
                {data.goals.map((goal) => (
                  <div className="goal" key={goal.id}>
                    <div className="goal-row">
                      <strong>{goal.title}</strong>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="bar"><span style={{ width: `${goal.progress}%` }} /></div>
                    {goal.target_date && <p className="muted">Target: {goal.target_date}</p>}
                    <div className="actions">
                      <button disabled={loading} onClick={() => void runAction("PATCH", `/api/dashboard/goals/${goal.id}`, { status: "done", progress: 100 })}>Complete</button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-title"><h2>Calendar</h2><span>{data.date}</span></div>
              {data.calendarEvents.length === 0 && <p className="muted">No events found for this day.</p>}
              {data.calendarEvents.map((event) => (
                <div className="line-item" key={event.id ?? event.summary}>
                  <time>{formatTime(event.start?.dateTime ?? event.start?.date)}</time>
                  <span>{event.summary ?? "Untitled event"}</span>
                </div>
              ))}
            </article>

            <article className="panel">
              <div className="panel-title"><h2>Tasks</h2><span>{data.tasks.length} open</span></div>
              {data.tasks.length === 0 && <p className="muted">No open tasks found.</p>}
              {data.tasks.map((task) => (
                <div className="line-item" key={task.id ?? task.path ?? task.title}>
                  <span>{task.title ?? "Untitled task"}</span>
                  {task.due && <time>{new Date(task.due).toLocaleDateString()}</time>}
                  <div className="actions compact">
                    <button disabled={loading} onClick={() => void queueItemAction("task", "done", task)}>Done</button>
                    <button className="secondary" disabled={loading} onClick={() => void queueItemAction("task", "remove", task)}>Remove</button>
                  </div>
                </div>
              ))}
            </article>

            <article className="panel wide">
              <div className="panel-title"><h2>Reminders</h2><span>{data.reminders.length} due</span></div>
              {data.reminders.length === 0 && <p className="muted">No reminders due by this day.</p>}
              {data.reminders.map((reminder) => (
                <div className="line-item" key={reminder.id}>
                  <time>{formatTime(reminder.remind_at)}</time>
                  <span>{reminder.message}</span>
                  <div className="actions compact">
                    <button disabled={loading} onClick={() => void queueItemAction("reminder", "done", reminder)}>Done</button>
                    <button className="secondary" disabled={loading} onClick={() => void queueItemAction("reminder", "remove", reminder)}>Remove</button>
                  </div>
                </div>
              ))}
            </article>

            <article className="panel wide">
              <div className="panel-title"><h2>Memory Highlights</h2><span>{data.memories.length} saved</span></div>
              {data.memories.length === 0 && <p className="muted">No memory highlights synced.</p>}
              {data.memories.map((memory, index) => (
                <div className="line-item" key={memory.id ?? `${memory.kind ?? "memory"}-${index}`}>
                  <span>{memory.content ?? memory.title ?? "Memory highlight"}</span>
                  {memory.kind && <span className="muted">{memory.kind}</span>}
                </div>
              ))}
            </article>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
