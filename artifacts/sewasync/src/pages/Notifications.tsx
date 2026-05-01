import { useState } from "react";
import {
  useListNotifications,
  useSendNotification,
  useListEvents,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AUDIENCES = [
  { value: "all_sangat", label: "All Sangat" },
  { value: "active_volunteers", label: "Active Volunteers" },
  { value: "event_volunteers", label: "Event-Specific Volunteers" },
];

const CHANNELS = [
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

interface Notification {
  id: number;
  title: string;
  message: string;
  audience: string;
  channels: string[];
  eventId?: number;
  sentBy?: string;
  sentAt: string;
}

interface Event {
  id: number;
  title: string;
}

export default function Notifications() {
  const { data: notifications = [], isLoading } = useListNotifications();
  const { data: events = [] } = useListEvents();
  const sendNotification = useSendNotification();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    message: "",
    audience: "all_sangat",
    channels: ["sms"] as string[],
    eventId: "",
  });

  function toggleChannel(ch: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.channels.length === 0) {
      toast({ title: "Select at least one channel", variant: "destructive" });
      return;
    }
    try {
      await sendNotification.mutateAsync({
        data: {
          title: form.title,
          message: form.message,
          audience: form.audience as "all_sangat" | "active_volunteers" | "event_volunteers",
          channels: form.channels as ("sms" | "email")[],
          eventId: form.eventId ? Number(form.eventId) : undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      setForm({ title: "", message: "", audience: "all_sangat", channels: ["sms"], eventId: "" });
      toast({ title: "Notification sent successfully" });
    } catch {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notification System</h1>
        <p className="text-muted-foreground text-sm mt-1">Broadcast messages to Sangat and Sewadars</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-card border border-card-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Send Broadcast
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subject / Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guru Nanak Jayanti Reminder" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Message *</label>
              <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message to the Sangat..." className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Audience *</label>
              <div className="space-y-2">
                {AUDIENCES.map((a) => (
                  <label key={a.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value={a.value}
                      checked={form.audience === a.value}
                      onChange={(e) => setForm({ ...form, audience: e.target.value })}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">{a.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.audience === "event_volunteers" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Event</label>
                <select value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select event...</option>
                  {(events as Event[]).map((ev) => <option key={ev.id} value={String(ev.id)}>{ev.title}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Channels *</label>
              <div className="flex gap-3">
                {CHANNELS.map((ch) => (
                  <label key={ch.value} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${form.channels.includes(ch.value) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    <input type="checkbox" checked={form.channels.includes(ch.value)} onChange={() => toggleChannel(ch.value)} className="sr-only" />
                    {ch.label}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={sendNotification.isPending} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              <Send className="w-4 h-4" />
              {sendNotification.isPending ? "Sending..." : "Send Notification"}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="bg-card border border-card-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Sent Broadcasts
            </h2>
          </div>
          {isLoading ? (
            <div className="p-5 animate-pulse space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}</div>
          ) : (notifications as Notification[]).length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {[...(notifications as Notification[])].reverse().map((n) => (
                <div key={n.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm text-foreground">{n.title}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      {n.channels.map((ch) => (
                        <span key={ch} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">{ch.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="capitalize">{n.audience.replace(/_/g, " ")}</span>
                    <span>&bull;</span>
                    <span>{new Date(n.sentAt).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
