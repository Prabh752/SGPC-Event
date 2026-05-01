import { useState } from "react";
import { useListEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { Plus, Pencil, Trash2, Calendar, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  { value: "major_gurpurab", label: "Major Gurpurab" },
  { value: "regular_diwan", label: "Regular Diwan" },
  { value: "kirtan_darbar", label: "Kirtan Darbar" },
  { value: "amrit_sanchar", label: "Amrit Sanchar" },
  { value: "community_camp", label: "Community Camp" },
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  major_gurpurab: "bg-orange-100 text-orange-800 border border-orange-200",
  regular_diwan: "bg-blue-100 text-blue-800 border border-blue-200",
  kirtan_darbar: "bg-purple-100 text-purple-800 border border-purple-200",
  amrit_sanchar: "bg-green-100 text-green-800 border border-green-200",
  community_camp: "bg-teal-100 text-teal-800 border border-teal-200",
};

interface EventForm {
  title: string;
  date: string;
  type: string;
  volunteersNeeded: number;
  estimatedBudget: number;
  description: string;
}

const EMPTY_FORM: EventForm = {
  title: "",
  date: "",
  type: "regular_diwan",
  volunteersNeeded: 10,
  estimatedBudget: 0,
  description: "",
};

interface Event {
  id: number;
  title: string;
  date: string;
  type: string;
  volunteersNeeded: number;
  estimatedBudget: number;
  description?: string;
  createdAt: string;
}

export default function Events() {
  const { data: events = [], isLoading } = useListEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);

  const filtered = (events as Event[]).filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType ? e.type === filterType : true;
    return matchSearch && matchType;
  });

  function openCreate() {
    setEditEvent(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(event: Event) {
    setEditEvent(event);
    setForm({
      title: event.title,
      date: event.date,
      type: event.type,
      volunteersNeeded: event.volunteersNeeded,
      estimatedBudget: Number(event.estimatedBudget),
      description: event.description ?? "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      date: form.date,
      type: form.type as "major_gurpurab" | "regular_diwan" | "kirtan_darbar" | "amrit_sanchar" | "community_camp",
      volunteersNeeded: Number(form.volunteersNeeded),
      estimatedBudget: Number(form.estimatedBudget),
      description: form.description || undefined,
    };

    try {
      if (editEvent) {
        await updateEvent.mutateAsync({ id: editEvent.id, data: payload });
        toast({ title: "Event updated successfully" });
      } else {
        await createEvent.mutateAsync({ data: payload });
        toast({ title: "Event created successfully" });
      }
      await qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
      setShowModal(false);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this event? This will also remove all linked volunteers and expenses.")) return;
    try {
      await deleteEvent.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
      toast({ title: "Event deleted" });
    } catch {
      toast({ title: "Failed to delete event", variant: "destructive" });
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage Gurdwara events and programs</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Types</option>
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-card-border">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No events found</p>
          <button onClick={openCreate} className="mt-3 text-sm text-primary hover:underline">Create your first event</button>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Event</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Volunteers</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Budget</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((event, idx) => (
                  <tr key={event.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{event.title}</p>
                      {event.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{event.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${EVENT_TYPE_COLORS[event.type] ?? "bg-gray-100 text-gray-700"}`}>
                        {EVENT_TYPES.find((t) => t.value === event.type)?.label ?? event.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{event.volunteersNeeded}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground hidden md:table-cell">{formatINR(Number(event.estimatedBudget))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(event)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-lg text-foreground">{editEvent ? "Edit Event" : "New Event"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <span className="text-xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Event Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Guru Nanak Jayanti 2025"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Event Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Volunteers Needed *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.volunteersNeeded}
                    onChange={(e) => setForm({ ...form, volunteersNeeded: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Budget (₹) *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.estimatedBudget}
                    onChange={(e) => setForm({ ...form, estimatedBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of the event..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEvent.isPending || updateEvent.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {editEvent ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
