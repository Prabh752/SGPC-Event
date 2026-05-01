import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useDeleteUser,
  useListActivityLogs,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Trash2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "event_manager", label: "Event Manager" },
  { value: "sewadar", label: "Sewadar" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-orange-100 text-orange-800",
  event_manager: "bg-blue-100 text-blue-800",
  sewadar: "bg-green-100 text-green-800",
};

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  lastLogin?: string;
  createdAt: string;
}

interface ActivityLog {
  id: number;
  userId?: number;
  userName?: string;
  action: string;
  timestamp: string;
}

export default function Admin() {
  const { data: users = [], isLoading: usersLoading } = useListUsers();
  const { data: logs = [], isLoading: logsLoading } = useListActivityLogs();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", role: "event_manager", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUser.mutateAsync({
        data: {
          username: form.username,
          name: form.name,
          role: form.role as "super_admin" | "event_manager" | "sewadar",
          password: form.password,
        },
      });
      await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setShowModal(false);
      setForm({ username: "", name: "", role: "event_manager", password: "" });
      toast({ title: "User added successfully" });
    } catch {
      toast({ title: "Failed to add user", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this user? This cannot be undone.")) return;
    try {
      await deleteUser.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User removed" });
    } catch {
      toast({ title: "Failed to remove user", variant: "destructive" });
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">System user management and global audit log</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users */}
        <div className="bg-card border border-card-border rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              System Users
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>
          {usersLoading ? (
            <div className="p-5 animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}</div>
          ) : (users as User[]).length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(users as User[]).map((user) => (
                <div key={user.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground">{user.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                        {ROLES.find((r) => r.value === user.role)?.label ?? user.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">@{user.username}</p>
                    {user.lastLogin && <p className="text-xs text-muted-foreground mt-0.5">Last login: {new Date(user.lastLogin).toLocaleDateString("en-IN")}</p>}
                  </div>
                  <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 ml-3">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-card border border-card-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Global Activity Log
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Immutable audit trail of all actions</p>
          </div>
          {logsLoading ? (
            <div className="p-5 animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}</div>
          ) : (logs as ActivityLog[]).length === 0 ? (
            <div className="text-center py-10">
              <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {[...(logs as ActivityLog[])].reverse().map((log) => (
                <div key={log.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <p className="text-sm text-foreground">{log.action}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {log.userName && <span className="font-medium text-primary">{log.userName}</span>}
                    {log.userName && <span>&bull;</span>}
                    <span>{new Date(log.timestamp).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add user modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-lg text-foreground">Add System User</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gurpreet Singh" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Username *</label>
                <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. gurpreet.singh" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password *</label>
                <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a password" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createUser.isPending} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
