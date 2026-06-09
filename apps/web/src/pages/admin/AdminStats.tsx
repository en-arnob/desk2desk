import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Layers, Users } from 'lucide-react';
import { DashboardStats, RequestStatus } from '@desk2desk/shared';
import { apiGet } from '@/lib/api';
import {
  BarRow,
  MiniStat,
  Panel,
  STATUS_META,
  formatDuration,
} from '@/components/StatsUI';
import { Loader } from '@/components/Logo';
import { Button } from '@/components/ui/button';

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
    return <p className="text-muted-foreground">No statistics available.</p>;
  }

  const statusMax = Math.max(1, ...Object.values(admin.byStatus));
  const categoryMax = Math.max(1, ...admin.byCategory.map((c) => c.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide support activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Total requests" value={admin.totalRequests} accent />
        <MiniStat
          label="Open backlog"
          value={admin.openBacklog}
          sub={`${admin.unassignedOpen} unassigned`}
        />
        <MiniStat
          label="Resolved + Closed"
          value={admin.byStatus.RESOLVED + admin.byStatus.CLOSED}
        />
        <MiniStat
          label="Avg response"
          value={formatDuration(admin.avgResponseMinutes)}
        />
        <MiniStat
          label="Avg resolution"
          value={formatDuration(admin.avgResolutionMinutes)}
        />
        <MiniStat
          label="Active providers"
          value={admin.activeProviders}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Created today" value={admin.createdToday} />
        <MiniStat label="Created this week" value={admin.createdThisWeek} />
        <MiniStat label="In progress" value={admin.byStatus.IN_PROGRESS} />
        <MiniStat label="Open" value={admin.byStatus.OPEN} />
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

      <div className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold">Provider workload</h3>
            <p className="text-sm text-muted-foreground">
              Per-provider activity with date ranges and filters.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/workload">View workload →</Link>
        </Button>
      </div>
    </div>
  );
}
