import { useState } from "react";
import { useListEvents } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Link } from "wouter";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_TYPE_LABELS: Record<string, string> = {
  major_gurpurab: "Gurpurab",
  regular_diwan: "Diwan",
  kirtan_darbar: "Kirtan",
  amrit_sanchar: "Amrit",
  community_camp: "Camp",
};

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  major_gurpurab: { bg: "bg-orange-100 border-orange-300", text: "text-orange-800", dot: "bg-orange-500" },
  regular_diwan:  { bg: "bg-blue-100 border-blue-300",   text: "text-blue-800",   dot: "bg-blue-500"   },
  kirtan_darbar:  { bg: "bg-purple-100 border-purple-300",text: "text-purple-800", dot: "bg-purple-500" },
  amrit_sanchar:  { bg: "bg-green-100 border-green-300", text: "text-green-800",  dot: "bg-green-500"  },
  community_camp: { bg: "bg-teal-100 border-teal-300",   text: "text-teal-800",   dot: "bg-teal-500"   },
};

interface Event {
  id: number;
  title: string;
  date: string;
  type: string;
  volunteersNeeded: number;
  estimatedBudget: number;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: events = [], isLoading } = useListEvents();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Map events by date string YYYY-MM-DD
  const eventsByDate: Record<string, Event[]> = {};
  (events as Event[]).forEach((ev) => {
    const key = ev.date.slice(0, 10);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDate(null);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(null);
  }

  // Build calendar grid cells
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < totalCells) cells.push(null);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  // Count upcoming events this month
  const thisMonthEvents = (events as Event[]).filter((ev) => {
    const d = new Date(ev.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Religious Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {thisMonthEvents.length} event{thisMonthEvents.length !== 1 ? "s" : ""} in {MONTHS[viewMonth]} {viewYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors font-medium"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-foreground min-w-[160px] text-center text-sm">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => {
          const colors = EVENT_TYPE_COLORS[type];
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-full ${colors?.dot ?? "bg-gray-400"}`} />
              {label}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((day) => (
              <div key={day} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">Loading calendar...</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                const isToday =
                  day !== null &&
                  viewYear === today.getFullYear() &&
                  viewMonth === today.getMonth() &&
                  day === today.getDate();

                const dateStr =
                  day !== null
                    ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    : "";
                const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : [];
                const isSelected = selectedDate === dateStr && day !== null;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (day !== null) {
                        setSelectedDate(isSelected ? null : dateStr);
                      }
                    }}
                    className={[
                      "min-h-[72px] md:min-h-[90px] p-1.5 border-r border-b border-border transition-colors",
                      day === null ? "bg-muted/20" : "cursor-pointer",
                      isSelected ? "bg-primary/10 ring-2 ring-inset ring-primary/40" : day !== null ? "hover:bg-muted/40" : "",
                      idx % 7 === 6 ? "border-r-0" : "",
                    ].join(" ")}
                  >
                    {day !== null && (
                      <>
                        <div className="flex justify-end mb-1">
                          <span
                            className={[
                              "w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full",
                              isToday
                                ? "bg-primary text-primary-foreground"
                                : isSelected
                                ? "text-primary"
                                : "text-foreground",
                            ].join(" ")}
                          >
                            {day}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => {
                            const colors = EVENT_TYPE_COLORS[ev.type];
                            return (
                              <div
                                key={ev.id}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border truncate ${colors?.bg ?? "bg-gray-100 border-gray-300"} ${colors?.text ?? "text-gray-700"}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors?.dot ?? "bg-gray-400"}`} />
                                <span className="truncate hidden sm:block">{ev.title}</span>
                                <span className="truncate sm:hidden">{EVENT_TYPE_LABELS[ev.type] ?? ev.type}</span>
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day events */}
          {selectedDate ? (
            <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <p className="font-semibold text-sm text-foreground">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedEvents.length === 0 ? "No events" : `${selectedEvents.length} event${selectedEvents.length > 1 ? "s" : ""}`}
                </p>
              </div>
              {selectedEvents.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No events on this day</p>
                  <Link href="/events">
                    <span className="text-xs text-primary hover:underline cursor-pointer mt-1 block">Create an event</span>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {selectedEvents.map((ev) => {
                    const colors = EVENT_TYPE_COLORS[ev.type];
                    return (
                      <div key={ev.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors?.dot ?? "bg-gray-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{ev.title}</p>
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${colors?.bg ?? "bg-gray-100"} ${colors?.text ?? "text-gray-700"}`}>
                              {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                            </span>
                            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                              <p>{ev.volunteersNeeded} sewadars needed</p>
                              <p>Budget: ₹{Number(ev.estimatedBudget).toLocaleString("en-IN")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl shadow-sm p-5 text-center">
              <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click any date to see its events</p>
            </div>
          )}

          {/* This month's events list */}
          <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <p className="font-semibold text-sm text-foreground">{MONTHS[viewMonth]} Events</p>
            </div>
            {thisMonthEvents.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No events this month</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {[...thisMonthEvents]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((ev) => {
                    const colors = EVENT_TYPE_COLORS[ev.type];
                    const day = new Date(ev.date.slice(0, 10) + "T00:00:00").getDate();
                    return (
                      <button
                        key={ev.id}
                        onClick={() => {
                          const ds = ev.date.slice(0, 10);
                          setSelectedDate(selectedDate === ds ? null : ds);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-foreground leading-none">{day}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                          <span className={`text-xs font-medium ${colors?.text ?? "text-gray-600"}`}>
                            {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
