import { useState } from "react";
import {
  useListVolunteers,
  useCreateVolunteer,
  useDeleteVolunteer,
  useListEvents,
  useGetVolunteerFulfillment,
  getListVolunteersQueryKey,
  getGetVolunteerFulfillmentQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEPARTMENTS = [
  { value: "langar", label: "Langar" },
  { value: "joda_ghar", label: "Joda Ghar" },
  { value: "parking", label: "Parking" },
  { value: "kirtan_stage", label: "Kirtan / Stage" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
];

const DEPT_COLORS: Record<string, string> = {
  langar: "bg-orange-100 text-orange-800",
  joda_ghar: "bg-blue-100 text-blue-800",
  parking: "bg-yellow-100 text-yellow-800",
  kirtan_stage: "bg-purple-100 text-purple-800",
  cleaning: "bg-teal-100 text-teal-800",
  security: "bg-red-100 text-red-800",
};

interface Volunteer {
  id: number;
  eventId: number;
  eventTitle?: string;
  name: string;
  phone: string;
  department: string;
  registeredAt: string;
}

interface Event {
  id: number;
  title: string;
}

interface VolunteerFulfillment {
  eventId: number;
  eventTitle: string;
  volunteersNeeded: number;
  volunteersRegistered: number;
  fulfillmentPercent: number;
}

export default function Volunteers() {
  const { data: volunteers = [], isLoading } = useListVolunteers();
  const { data: events = [] } = useListEvents();
  const { data: fulfillment = [] } = useGetVolunteerFulfillment();
  const createVolunteer = useCreateVolunteer();
  const deleteVolunteer = useDeleteVolunteer();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ eventId: "", name: "", phone: "", department: "langar" });

  const filtered = (volunteers as Volunteer[]).filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search);
    const matchEvent = filterEvent ? String(v.eventId) === filterEvent : true;
    const matchDept = filterDept ? v.department === filterDept : true;
    return matchSearch && matchEvent && matchDept;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createVolunteer.mutateAsync({
        data: {
          eventId: Number(form.eventId),
          name: form.name,
          phone: form.phone,
          department: form.department as "langar" | "joda_ghar" | "parking" | "kirtan_stage" | "cleaning" | "security",
        },
      });
      await qc.invalidateQueries({ queryKey: getListVolunteersQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetVolunteerFulfillmentQueryKey() });
      setShowModal(false);
      setForm({ eventId: "", name: "", phone: "", department: "langar" });
      toast({ title: "Sewadar registered successfully" });
    } catch {
      toast({ title: "Failed to register sewadar", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this sewadar?")) return;
    try {
      await deleteVolunteer.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListVolunteersQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetVolunteerFulfillmentQueryKey() });
      toast({ title: "Sewadar removed" });
    } catch {
      toast({ title: "Failed to remove sewadar", variant: "destructive" });
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Volunteer Allocation (Sewa)</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage sewadars and track fulfillment per event</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Register Sewadar
        </button>
      </div>

      {/* Fulfillment cards */}
      {(fulfillment as VolunteerFulfillment[]).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(fulfillment as VolunteerFulfillment[]).map((f) => (
            <div key={f.eventId} className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
              <p className="font-medium text-sm text-foreground truncate">{f.eventTitle}</p>
              <div className="flex items-center justify-between mt-2 mb-1.5">
                <span className="text-xs text-muted-foreground">{f.volunteersRegistered} / {f.volunteersNeeded} sewadars</span>
                <span className={`text-xs font-bold ${f.fulfillmentPercent >= 80 ? "text-green-600" : f.fulfillmentPercent >= 50 ? "text-orange-500" : "text-red-500"}`}>
                  {f.fulfillmentPercent}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${f.fulfillmentPercent >= 80 ? "bg-green-500" : f.fulfillmentPercent >= 50 ? "bg-orange-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, f.fulfillmentPercent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Events</option>
          {(events as Event[]).map((ev) => <option key={ev.id} value={String(ev.id)}>{ev.title}</option>)}
        </select>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-card-border">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No sewadars found</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Department</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Event</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{v.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${DEPT_COLORS[v.department] ?? "bg-gray-100 text-gray-700"}`}>
                        {DEPARTMENTS.find((d) => d.value === v.department)?.label ?? v.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{v.eventTitle ?? `Event #${v.eventId}`}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
          <div className="bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-lg text-foreground">Register Sewadar</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Event *</label>
                <select required value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select event...</option>
                  {(events as Event[]).map((ev) => <option key={ev.id} value={String(ev.id)}>{ev.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gurpreet Singh" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone *</label>
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91-98765-43210" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Department *</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createVolunteer.isPending} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
