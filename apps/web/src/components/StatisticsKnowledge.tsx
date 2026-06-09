import { useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StatisticsKnowledge({ open, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold">
              Statistics — what each number means
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto px-6 py-5 text-sm">
          <p className="text-muted-foreground">
            Every figure is computed from the same request data. Once you
            understand the building blocks, the rest follows.
          </p>

          <Section title="The building blocks">
            <p className="text-muted-foreground">
              Every request is timestamped at each step of its lifecycle. Most
              metrics are just counts, or the time between two stamps.
            </p>
            <Table
              head={['Stamp', 'Set when…']}
              rows={[
                ['Created', 'the requester submits the request'],
                ['Started (claimed)', 'a provider claims it (→ In progress)'],
                ['Resolved', 'the provider marks it Resolved'],
                ['Closed', 'the requester confirms and closes it'],
              ]}
            />
            <p className="text-muted-foreground">
              Statuses: <b>Open</b> (waiting), <b>In progress</b> (being worked),{' '}
              <b>Resolved</b> (provider done, awaiting confirmation),{' '}
              <b>Closed</b> (confirmed / finished), <b>Reopened</b> (sent back),{' '}
              <b>Cancelled</b> (withdrawn).
            </p>
            <Note>
              “This week” means the <b>last 7 days</b> (rolling), not the
              calendar week. “Today” means since midnight.
            </Note>
          </Section>

          <Section title="Headline numbers">
            <Defs
              items={[
                ['Total requests', 'Every request ever created, all statuses.'],
                [
                  'Open backlog',
                  'Requests still waiting for work: Open + Reopened. Your “what’s outstanding now” number.',
                ],
                [
                  'Resolved + Closed',
                  'Requests that have been finished. Your “done” total.',
                ],
                [
                  'Avg response',
                  'Average time from created → claimed: how long requests wait before a provider picks them up. Lower is better.',
                ],
                [
                  'Avg resolution',
                  'Average time from claimed → resolved: how long a provider takes to finish once they start. Lower is better.',
                ],
                [
                  'Active providers',
                  'How many provider accounts are switched on (can take work) — a headcount, not a busyness measure.',
                ],
                [
                  'Created today / this week',
                  'New requests since midnight, and over the last 7 days. Good for spotting demand spikes.',
                ],
                [
                  'In progress / Open',
                  'Quick counts of those two statuses (also in the bar chart).',
                ],
              ]}
            />
          </Section>

          <Section title="The bar charts">
            <Defs
              items={[
                [
                  'Requests by status',
                  'The count in each status — shows where everything currently sits.',
                ],
                [
                  'Requests by category',
                  'How many requests fall under each category — shows where demand is concentrated.',
                ],
              ]}
            />
          </Section>

          <Section title="Workload page">
            <p className="text-muted-foreground">
              Activity broken down per provider, with a date range and category
              filter. The columns mix two kinds of measurement:
            </p>
            <Defs
              items={[
                [
                  'Handled',
                  'Requests resolved/closed within the selected date range. Change the range and this changes.',
                ],
                [
                  'Active now',
                  'Requests currently assigned and being worked — a right-now snapshot that ignores the date range.',
                ],
                [
                  'Avg resolution',
                  'That provider’s average claimed → resolved time over what they handled in the range.',
                ],
              ]}
            />
          </Section>

          <Section title="Is this good or bad?">
            <Table
              head={['If this is high…', '…it usually means']}
              rows={[
                ['Open backlog / unassigned', 'work arrives faster than it’s claimed'],
                ['Avg response', 'requests sit too long before someone starts'],
                ['Avg resolution', 'requests take long to finish once started'],
                ['Created today / week', 'demand is spiking'],
                ['A provider’s Active now', 'that person is overloaded right now'],
                ['A provider’s Handled', 'that person cleared a lot (good)'],
              ]}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Defs({ items }: { items: [string, string][] }) {
  return (
    <dl className="space-y-2">
      {items.map(([term, def]) => (
        <div key={term} className="rounded-lg border bg-muted/20 px-3 py-2">
          <dt className="font-medium">{term}</dt>
          <dd className="mt-0.5 text-muted-foreground">{def}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-left">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className={j === 0 ? 'px-3 py-2 font-medium' : 'px-3 py-2 text-muted-foreground'}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-2 border-primary/40 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
