import { useEffect, useState } from 'react';
import {
  AlarmClock,
  CheckCircle2,
  FolderKanban,
  Layers,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { DashboardStats, RequestStatus } from '@desk2desk/shared';
import { apiGet } from '@/lib/api';
import {
  BarRow,
  Panel,
  StatCard,
  STATUS_META,
  formatDuration,
} from '@/components/StatsUI';
import { Loader } from '@/components/Logo';

export function AdminStatsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DashboardStats>('/requests/stats')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <Loader />;
  }

  const admin = stats.admin;
  if (!admin) {
    return (
      <p className="text-muted-foreground">No statistics available.</p>
    );
  }

  const statusMax = Math.max(1, ...Object.values(admin.byStatus));
  const categoryMax = Math.max(1, ...admin.byCategory.map((c) => c.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide support activity and provider workload.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Total requests"
          value={admin.totalRequests}
          brand
        />
        <StatCard
          icon={AlarmClock}
          label="Open backlog"
          value={admin.openBacklog}
          sub={`${admin.unassignedOpen} unassigned`}
        />
        <StatCard
          icon={Timer}
          label="Avg response"
          value={formatDuration(admin.avgResponseMinutes)}
          sub="Created → picked up"
        />
        <StatCard
          icon={Timer}
          label="Avg resolution"
          value={formatDuration(admin.avgResolutionMinutes)}
          sub="Picked up → resolved"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Created today"
          value={admin.createdToday}
        />
        <StatCard
          icon={TrendingUp}
          label="Created this week"
          value={admin.createdThisWeek}
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved + Closed"
          value={admin.byStatus.RESOLVED + admin.byStatus.CLOSED}
        />
        <StatCard
          icon={Users}
          label="Active providers"
          value={admin.activeProviders}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Requests by status" icon={Layers}>
          <div className="space-y-3">
            {(Object.keys(admin.byStatus) as RequestStatus[]).map((s) => (
              <BarRow
                key={s}
                label={STATUS_META[s].label}
                count={admin.byStatus[s]}
                max={statusMax}
                color={STATUS_META[s].color}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Requests by category" icon={FolderKanban}>
          {admin.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-3">
              {admin.byCategory.map((c) => (
                <BarRow
                  key={c.name}
                  label={c.name}
                  count={c.count}
                  max={categoryMax}
                  color="var(--color-primary)"
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Provider workload" icon={Users}>
        {admin.topProviders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No providers have handled requests yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 text-right font-medium">Active</th>
                  <th className="px-4 py-2 text-right font-medium">Handled</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admin.topProviders.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{p.name}</span>{' '}
                      <span className="text-xs text-muted-foreground">
                        #{p.id}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {p.active}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {p.handled}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
