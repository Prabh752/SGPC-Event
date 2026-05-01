import { useState } from "react";
import {
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  useListEvents,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { IndianRupee, Plus, Trash2, TrendingUp, TrendingDown, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Expense {
  id: number;
  eventId: number;
  eventTitle?: string;
  description: string;
  amount: number;
  date: string;
  loggedBy?: string;
}

interface Event {
  id: number;
  title: string;
  estimatedBudget: number;
}

export default function Budget() {
  const { data: expenses = [], isLoading } = useListExpenses();
  const { data: events = [] } = useListEvents();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ eventId: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });

  const filtered = (expenses as Expense[]).filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchEvent = filterEvent ? String(e.eventId) === filterEvent : true;
    return matchSearch && matchEvent;
  });

  // Per-event budget summary
  const eventSummaries = (events as Event[]).map((ev) => {
    const evExpenses = (expenses as Expense[]).filter((e) => e.eventId === ev.id);
    const actualSpend = evExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const estimated = Number(ev.estimatedBudget);
    const variance = estimated - actualSpend;
    return { event: ev, actualSpend, variance, isOverBudget: actualSpend > estimated };
  }).filter((s) => s.actualSpend > 0 || s.event.estimatedBudget > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createExpense.mutateAsync({
        data: {
          eventId: Number(form.eventId),
          description: form.description,
          amount: Number(form.amount),
          date: form.date,
        },
      });
      await qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      setShowModal(false);
      setForm({ eventId: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
      toast({ title: "Expense logged successfully" });
    } catch {
      toast({ title: "Failed to log expense", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      toast({ title: "Expense deleted" });
    } catch {
      toast({ title: "Failed to delete expense", variant: "destructive" });
    }
  }

  const totalEstimated = (events as Event[]).reduce((sum, e) => sum + Number(e.estimatedBudget), 0);
  const totalActual = (expenses as Expense[]).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalVariance = totalEstimated - totalActual;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget Estimation & Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor and track expenses in Indian Rupees</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Log Expense
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Total Estimated</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatINR(totalEstimated)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Total Actual Spend</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatINR(totalActual)}</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm border ${totalVariance < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            {totalVariance < 0 ? <TrendingDown className="w-4 h-4 text-red-600" /> : <TrendingUp className="w-4 h-4 text-green-600" />}
            <p className={`text-sm font-medium ${totalVariance < 0 ? "text-red-700" : "text-green-700"}`}>
              {totalVariance < 0 ? "Over Budget" : "Under Budget"}
            </p>
          </div>
          <p className={`text-xl font-bold ${totalVariance < 0 ? "text-red-700" : "text-green-700"}`}>
            {formatINR(Math.abs(totalVariance))}
          </p>
        </div>
      </div>

      {/* Per-event health */}
      {eventSummaries.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20">
            <h2 className="font-semibold text-foreground">Per-Event Budget Health</h2>
          </div>
          <div className="divide-y divide-border">
            {eventSummaries.map(({ event, actualSpend, variance, isOverBudget }) => (
              <div key={event.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{event.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Budget: {formatINR(Number(event.estimatedBudget))}</span>
                    <span>Spent: {formatINR(actualSpend)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isOverBudget ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {isOverBudget ? (
                      <><TrendingDown className="w-3.5 h-3.5" /> Over by {formatINR(Math.abs(variance))}</>
                    ) : (
                      <><TrendingUp className="w-3.5 h-3.5" /> {formatINR(variance)} left</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Events</option>
          {(events as Event[]).map((ev) => <option key={ev.id} value={String(ev.id)}>{ev.title}</option>)}
        </select>
      </div>

      {/* Expenses table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-card-border">
          <IndianRupee className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No expenses found</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Event</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{expense.description}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{expense.eventTitle ?? `Event #${expense.eventId}`}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{expense.date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatINR(Number(expense.amount))}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(expense.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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
              <h2 className="font-bold text-lg text-foreground">Log Expense</h2>
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
                <label className="block text-sm font-medium text-foreground mb-1">Description *</label>
                <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Tent Setup, Groceries..." className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Amount (₹) *</label>
                  <input required type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createExpense.isPending} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Log Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
