import { useEffect, useState } from "react";
import { CommandCenter, type DashboardData, type Reminder, type Task } from "./components/command-center";

type DashboardAction = "done" | "remove";

function storedToken() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("token")) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return localStorage.getItem("exec-dashboard-token") ?? "";
}

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function Login({ error, onToken }: { error: string | null; onToken: (value: string) => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="card-surface w-full max-w-md p-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Hermes Assistant</p>
        <h1 className="mb-3 text-4xl font-semibold text-foreground">Dashboard access</h1>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Paste your dashboard token to view goals, calendar, tasks, reminders, and the AI overview.
        </p>
        {error && <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onToken(String(form.get("token") ?? "").trim());
          }}
        >
          <input className="rounded-2xl border border-input bg-background px-4 py-3 text-foreground" name="token" type="password" placeholder="Dashboard token" />
          <button className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-foreground">Open dashboard</button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [token, setToken] = useState(storedToken());
  const [selectedDate, setSelectedDate] = useState(isoDate());
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
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

  async function queueItemAction(targetType: "task" | "reminder", action: DashboardAction, item: Task | Reminder) {
    const title = "title" in item ? item.title : item.message;
    const ok = await runAction("POST", "/api/dashboard/actions", {
      targetType,
      action,
      targetId: item.id,
      targetPath: "path" in item ? item.path : undefined,
      title
    });
    if (ok) setNotice(`${targetType === "task" ? "Task" : "Reminder"} ${action === "done" ? "done" : "remove"} action queued.`);
  }

  useEffect(() => {
    if (!token) return;
    localStorage.setItem("exec-dashboard-token", token);
    void loadDashboard(token, selectedDate);
  }, [token, selectedDate]);

  if (!token) return <Login error={error} onToken={setToken} />;

  return (
    <CommandCenter
      data={data}
      selectedDate={selectedDate}
      loading={loading}
      error={error}
      notice={notice}
      onDateChange={setSelectedDate}
      onGoalComplete={(goal) => void runAction("PATCH", `/api/dashboard/goals/${goal.id}`, { status: "done", progress: 100 })}
      onTaskAction={(action, task) => void queueItemAction("task", action, task)}
      onReminderAction={(action, reminder) => void queueItemAction("reminder", action, reminder)}
    />
  );
}
