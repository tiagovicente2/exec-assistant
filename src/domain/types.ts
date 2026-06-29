export type Goal = {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "paused" | "done" | "cancelled";
  progress: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  message: string;
  remind_at: string;
  timezone: string;
  status: "scheduled" | "sent" | "cancelled";
  recurrence_rule: string | null;
};

export type Memory = {
  id: string;
  kind: string;
  content: string;
  importance: number;
  created_at: string;
};
