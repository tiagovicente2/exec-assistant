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
};

type CalendarEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type Task = {
  id?: string;
  title?: string;
  due?: string;
  status?: string;
  completed?: string;
};

type DashboardData = {
  date: string;
  timezone: string;
  google: { connected: boolean; error: string | null; source?: string; syncedAt?: string | null };
  highlights: string[];
  goals: Goal[];
  reminders: Reminder[];
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

function App() {
  const [token, setToken] = useState(storedToken());
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadDashboard(currentToken: string) {
    if (!currentToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { headers: { "x-dashboard-token": currentToken } });
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
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "x-dashboard-token": token, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadDashboard(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    localStorage.setItem("exec-dashboard-token", token);
    void loadDashboard(token);
  }, [token]);

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
          <h1>Today's command center</h1>
          <p>{data ? `${data.date} · ${data.timezone}` : "Loading your day..."}</p>
        </div>
        <div className="connect passive">Google via Hermes</div>
      </header>

      {loading && <div className="notice">Loading dashboard...</div>}
      {error && <div className="notice error">{error}</div>}
      {data?.google.error && <div className="notice error">Google: {data.google.error}</div>}

      {data && (
        <>
          <section className="highlights">
            {data.highlights.map((item) => (
              <article className="highlight" key={item}>{item}</article>
            ))}
          </section>

          {data.google.syncedAt && <div className="notice">Calendar/tasks synced by Hermes at {new Date(data.google.syncedAt).toLocaleString()}</div>}
          {data.notes && <div className="notice">{data.notes}</div>}

          <section className="grid">
            <article className="panel wide">
              <div className="panel-title">
                <h2>Goals Progress</h2>
                <span>{data.goals.length} active</span>
              </div>
              <div className="goal-list">
                {data.goals.length === 0 && <p className="muted">No active goals yet. Ask Hermes to create one from WhatsApp.</p>}
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
              <div className="panel-title"><h2>Calendar</h2><span>today</span></div>
              {data.calendarEvents.length === 0 && <p className="muted">No events found for today.</p>}
              {data.calendarEvents.map((event) => (
                <div className="line-item" key={event.id ?? event.summary}>
                  <time>{formatTime(event.start?.dateTime ?? event.start?.date)}</time>
                  <span>{event.summary ?? "Untitled event"}</span>
                </div>
              ))}
            </article>

            <article className="panel">
              <div className="panel-title"><h2>Tasks</h2><span>Google Tasks</span></div>
              {data.tasks.length === 0 && <p className="muted">No open tasks found.</p>}
              {data.tasks.map((task, index) => (
                <div className="line-item" key={task.id ?? task.title}>
                  <span>{task.title ?? "Untitled task"}</span>
                  {task.due && <time>{new Date(task.due).toLocaleDateString()}</time>}
                  <div className="actions compact">
                    <button disabled={loading} onClick={() => void runAction("PATCH", `/api/dashboard/tasks/${index}`, { status: "completed" })}>Done</button>
                    <button className="secondary" disabled={loading} onClick={() => void runAction("DELETE", `/api/dashboard/tasks/${index}`)}>Remove</button>
                  </div>
                </div>
              ))}
            </article>

            <article className="panel wide">
              <div className="panel-title"><h2>Reminders</h2><span>due today</span></div>
              {data.reminders.length === 0 && <p className="muted">No reminders due today.</p>}
              {data.reminders.map((reminder) => (
                <div className="line-item" key={reminder.id}>
                  <time>{formatTime(reminder.remind_at)}</time>
                  <span>{reminder.message}</span>
                  <div className="actions compact">
                    <button disabled={loading} onClick={() => void runAction("POST", `/api/dashboard/reminders/${reminder.id}/sent`)}>Done</button>
                    <button className="secondary" disabled={loading} onClick={() => void runAction("DELETE", `/api/dashboard/reminders/${reminder.id}`)}>Remove</button>
                  </div>
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
