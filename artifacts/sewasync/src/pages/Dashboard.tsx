import { useGetDashboardSummary } from "@workspace/api-client-react";
import { formatINR } from "@/lib/format";
import { Calendar, Users, IndianRupee, TrendingUp, AlertCircle, Clock } from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  major_gurpurab: "Major Gurpurab",
  regular_diwan: "Regular Diwan",
  kirtan_darbar: "Kirtan Darbar",
  amrit_sanchar: "Amrit Sanchar",
  community_camp: "Community Camp",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  major_gurpurab: "bg-orange-100 text-orange-800",
  regular_diwan: "bg-blue-100 text-blue-800",
  kirtan_darbar: "bg-purple-100 text-purple-800",
  amrit_sanchar: "bg-green-100 text-green-800",
  community_camp: "bg-teal-100 text-teal-800",
};

function StatCard({ title, value, sub, icon: Icon, accent }: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-card-border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-lg ${accent || "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-white" : "text-primary"}`} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const budgetVariance = (data?.totalEstimatedBudget ?? 0) - (data?.totalActualSpend ?? 0);
  const isOverBudget = budgetVariance < 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prabandhak Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Operational overview of the Gurdwara management portal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={String(data?.totalEvents ?? 0)}
          sub={`${data?.upcomingEvents ?? 0} upcoming`}
          icon={Calendar}
        />
        <StatCard
          title="Active Sewadars"
          value={String(data?.totalVolunteers ?? 0)}
          sub={`${data?.sewaFulfillmentPercent ?? 0}% sewa fulfillment`}
          icon={Users}
        />
        <StatCard
          title="Estimated Budget"
          value={formatINR(data?.totalEstimatedBudget ?? 0)}
          sub="Total across all events"
          icon={IndianRupee}
        />
        <StatCard
          title="Actual Spend"
          value={formatINR(data?.totalActualSpend ?? 0)}
          sub={isOverBudget ? "Over budget!" : `${formatINR(Math.abs(budgetVariance))} remaining`}
          icon={TrendingUp}
          accent={isOverBudget ? "bg-destructive" : undefined}
        />
      </div>

      {/* Sewa fulfillment bar */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Overall Sewa Fulfillment</h2>
          <span className="text-sm font-bold text-primary">{data?.sewaFulfillmentPercent ?? 0}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, data?.sewaFulfillmentPercent ?? 0)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {data?.totalVolunteers ?? 0} sewadars registered across all events
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Upcoming Events (30 days)</h2>
          </div>
          {(data?.upcomingEventsList?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming events in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.upcomingEventsList?.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${EVENT_TYPE_COLORS[event.type] ?? "bg-gray-100 text-gray-700"}`}>
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent expenses */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Recent Expenses</h2>
          </div>
          {(data?.recentExpenses?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <IndianRupee className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No expenses logged yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentExpenses?.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{expense.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground flex-shrink-0">{formatINR(Number(expense.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget health summary */}
      <div className={`rounded-xl p-4 border flex items-start gap-3 ${isOverBudget ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
        <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isOverBudget ? "text-red-600" : "text-green-600"}`} />
        <div>
          <p className={`font-medium text-sm ${isOverBudget ? "text-red-800" : "text-green-800"}`}>
            {isOverBudget ? "Budget Alert" : "Budget Health: Good"}
          </p>
          <p className={`text-xs mt-0.5 ${isOverBudget ? "text-red-700" : "text-green-700"}`}>
            {isOverBudget
              ? `Total spend exceeds budget by ${formatINR(Math.abs(budgetVariance))}. Review expenses.`
              : `${formatINR(budgetVariance)} remaining across all events. Spending is within limits.`}
          </p>
        </div>
      </div>
    </div>
  );
}
